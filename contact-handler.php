<?php
/**
 * Contact Form Handler
 * Stores contact form submissions in SQLite database
 */

// Load configuration
$configFile = __DIR__ . '/config.json';
if (!file_exists($configFile)) {
    error_log('Configuration file not found');
    http_response_code(500);
    sendResponse(false, 'Server configuration error');
}

$config = json_decode(file_get_contents($configFile), true);
if (!$config) {
    error_log('Invalid configuration file');
    http_response_code(500);
    sendResponse(false, 'Server configuration error');
}

// Configuration
define('DB_PATH', __DIR__ . '/data/contact_submissions.db');
define('ALLOWED_ORIGIN', 'https://colorscreenwithtimer.com');
define('RECAPTCHA_API_KEY', $config['recaptcha']['api_key'] ?? '');
define('RECAPTCHA_PROJECT_ID', $config['recaptcha']['project_id'] ?? '');
define('RECAPTCHA_SITE_KEY', $config['recaptcha']['site_key'] ?? '');

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/contact-form-errors.log');

// Set headers
header('Content-Type: application/json');

// CORS headers (adjust for your domain)
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (strpos($origin, 'colorscreenwithtimer.com') !== false ||
        strpos($origin, 'colorscreenwithtimer.local') !== false ||
        strpos($origin, 'localhost') !== false) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

/**
 * Initialize SQLite database and create table if not exists
 */
function initDatabase() {
    try {
        // Create data directory if it doesn't exist
        $dataDir = dirname(DB_PATH);
        if (!file_exists($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Create table if not exists
        $db->exec("
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT,
                message TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'new'
            )
        ");

        // Create index on email and submitted_at for faster queries
        $db->exec("
            CREATE INDEX IF NOT EXISTS idx_email
            ON contact_submissions(email)
        ");

        $db->exec("
            CREATE INDEX IF NOT EXISTS idx_submitted_at
            ON contact_submissions(submitted_at)
        ");

        return $db;
    } catch (PDOException $e) {
        error_log("Database initialization error: " . $e->getMessage());
        throw new Exception("Database error occurred");
    }
}

/**
 * Validate email address
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Sanitize input
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Verify reCAPTCHA Enterprise token
 */
function verifyRecaptcha($token, $expectedAction = 'submit') {
    if (empty(RECAPTCHA_API_KEY) || empty(RECAPTCHA_PROJECT_ID)) {
        error_log('reCAPTCHA configuration missing');
        return ['success' => false, 'error' => 'reCAPTCHA not configured'];
    }

    $projectId = RECAPTCHA_PROJECT_ID;
    $url = "https://recaptchaenterprise.googleapis.com/v1/projects/{$projectId}/assessments?key=" . RECAPTCHA_API_KEY;

    $requestBody = [
        'event' => [
            'token' => $token,
            'expectedAction' => $expectedAction,
            'siteKey' => RECAPTCHA_SITE_KEY
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Referer: https://colorscreenwithtimer.com/'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("reCAPTCHA API error: HTTP {$httpCode}, Response: {$response}");
        return ['success' => false, 'error' => 'reCAPTCHA verification failed'];
    }

    $result = json_decode($response, true);

    if (!$result) {
        error_log("reCAPTCHA invalid response: {$response}");
        return ['success' => false, 'error' => 'Invalid reCAPTCHA response'];
    }

    // Check if token is valid
    if (!isset($result['tokenProperties']['valid']) || !$result['tokenProperties']['valid']) {
        $reason = $result['tokenProperties']['invalidReason'] ?? 'unknown';
        error_log("reCAPTCHA token invalid: {$reason}");
        return ['success' => false, 'error' => 'Invalid reCAPTCHA token'];
    }

    // Check if action matches
    if (isset($result['tokenProperties']['action']) && $result['tokenProperties']['action'] !== $expectedAction) {
        error_log("reCAPTCHA action mismatch");
        return ['success' => false, 'error' => 'reCAPTCHA action mismatch'];
    }

    // Get risk score (0.0 = likely bot, 1.0 = likely human)
    $score = $result['riskAnalysis']['score'] ?? 0.0;

    // Require a minimum score of 0.5 (adjust as needed)
    if ($score < 0.5) {
        error_log("reCAPTCHA low score: {$score}");
        return ['success' => false, 'error' => 'reCAPTCHA score too low', 'score' => $score];
    }

    return [
        'success' => true,
        'score' => $score,
        'reasons' => $result['riskAnalysis']['reasons'] ?? []
    ];
}

/**
 * Rate limiting: Check if IP has submitted too many times recently
 */
function checkRateLimit($db, $ipAddress) {
    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM contact_submissions
        WHERE ip_address = :ip
        AND submitted_at > datetime('now', '-1 hour')
    ");
    $stmt->execute([':ip' => $ipAddress]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Allow max 5 submissions per hour from same IP
    return $result['count'] < 5;
}

/**
 * Save contact form submission
 */
function saveSubmission($db, $data) {
    try {
        $stmt = $db->prepare("
            INSERT INTO contact_submissions
            (name, email, subject, message, ip_address, user_agent)
            VALUES
            (:name, :email, :subject, :message, :ip_address, :user_agent)
        ");

        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':subject' => $data['subject'],
            ':message' => $data['message'],
            ':ip_address' => $data['ip_address'],
            ':user_agent' => $data['user_agent']
        ]);

        return $db->lastInsertId();
    } catch (PDOException $e) {
        error_log("Database insert error: " . $e->getMessage());
        throw new Exception("Failed to save submission");
    }
}

/**
 * Send response
 */
function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];

    if ($data !== null) {
        $response['data'] = $data;
    }

    echo json_encode($response);
    exit;
}

// Main execution
try {
    // Only accept POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, 'Method not allowed');
    }

    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // If no JSON, try form-data
    if ($data === null) {
        $data = $_POST;
    }

    // Validate required fields
    if (empty($data['email']) || empty($data['message'])) {
        http_response_code(400);
        sendResponse(false, 'Missing required fields: email and message are required');
    }

    // Sanitize inputs
    $name = isset($data['name']) ? sanitizeInput($data['name']) : 'Anonymous';
    $email = sanitizeInput($data['email']);
    $subject = isset($data['subject']) ? sanitizeInput($data['subject']) : 'Contact Form Submission';
    $message = sanitizeInput($data['message']);

    // Validate email
    if (!validateEmail($email)) {
        http_response_code(400);
        sendResponse(false, 'Invalid email address');
    }

    // Validate message length
    if (strlen($message) < 10 || strlen($message) > 5000) {
        http_response_code(400);
        sendResponse(false, 'Message must be between 10 and 5000 characters');
    }

    // Verify reCAPTCHA token
    $recaptchaToken = $data['g-recaptcha-response'] ?? '';
    if (empty($recaptchaToken)) {
        http_response_code(400);
        sendResponse(false, 'reCAPTCHA verification required');
    }

    $recaptchaResult = verifyRecaptcha($recaptchaToken, 'submit');
    if (!$recaptchaResult['success']) {
        http_response_code(400);
        sendResponse(false, 'reCAPTCHA verification failed. Please try again.');
    }

    // Get client information
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    // Initialize database
    $db = initDatabase();

    // Check rate limit
    if (!checkRateLimit($db, $ipAddress)) {
        http_response_code(429);
        sendResponse(false, 'Too many submissions. Please try again later.');
    }

    // Prepare data for insertion
    $submissionData = [
        'name' => $name,
        'email' => $email,
        'subject' => $subject,
        'message' => $message,
        'ip_address' => $ipAddress,
        'user_agent' => $userAgent
    ];

    // Save to database
    $submissionId = saveSubmission($db, $submissionData);

    // Success response
    http_response_code(200);
    sendResponse(true, 'Thank you for your message! We will get back to you soon.', [
        'submission_id' => $submissionId
    ]);

} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    http_response_code(500);
    sendResponse(false, 'An error occurred while processing your request. Please try again later.');
}
