<?php
/**
 * Admin Panel - View Contact Form Submissions
 * IMPORTANT: Protect this file with HTTP authentication or move to a secure admin area
 */

// Load configuration
$configFile = __DIR__ . '/config.json';
if (!file_exists($configFile)) {
    die('Configuration file not found. Please create config.json with admin credentials.');
}

$config = json_decode(file_get_contents($configFile), true);
if (!$config || !isset($config['admin']['username']) || !isset($config['admin']['password'])) {
    die('Invalid configuration file. Please check config.json structure.');
}

define('ADMIN_USERNAME', $config['admin']['username']);
define('ADMIN_PASSWORD', $config['admin']['password']);

// HTTP Basic Authentication
if (!isset($_SERVER['PHP_AUTH_USER']) ||
    $_SERVER['PHP_AUTH_USER'] !== ADMIN_USERNAME ||
    $_SERVER['PHP_AUTH_PW'] !== ADMIN_PASSWORD) {
    header('WWW-Authenticate: Basic realm="Admin Area"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Authentication required';
    exit;
}

define('DB_PATH', __DIR__ . '/data/contact_submissions.db');

try {
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Handle status update
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
        $id = (int)$_POST['id'];
        $status = $_POST['status'];

        $stmt = $db->prepare("UPDATE contact_submissions SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $id]);

        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }

    // Get filter parameters
    $statusFilter = $_GET['status'] ?? 'all';
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $perPage = 20;
    $offset = ($page - 1) * $perPage;

    // Build query
    $whereClause = '';
    $params = [];
    if ($statusFilter !== 'all') {
        $whereClause = 'WHERE status = :status';
        $params[':status'] = $statusFilter;
    }

    // Get total count
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM contact_submissions $whereClause");
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalCount / $perPage);

    // Get submissions
    $params[':limit'] = $perPage;
    $params[':offset'] = $offset;

    $stmt = $db->prepare("
        SELECT *
        FROM contact_submissions
        $whereClause
        ORDER BY submitted_at DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->execute($params);
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get status counts
    $statusCounts = $db->query("
        SELECT status, COUNT(*) as count
        FROM contact_submissions
        GROUP BY status
    ")->fetchAll(PDO::FETCH_KEY_PAIR);

} catch (PDOException $e) {
    die("Database error: " . $e->getMessage());
}

// Get timezone from query parameter or use EST as default
$selectedTimezone = $_GET['tz'] ?? 'America/New_York';

// Validate timezone
$validTimezones = DateTimeZone::listIdentifiers();
if (!in_array($selectedTimezone, $validTimezones)) {
    $selectedTimezone = 'America/New_York';
}

// Helper function to convert UTC to selected timezone
function convertToTimezone($utcTimestamp, $timezone) {
    $dt = new DateTime($utcTimestamp, new DateTimeZone('UTC'));
    $dt->setTimezone(new DateTimeZone($timezone));
    return $dt;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Submissions - Admin Panel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        h1 {
            margin-bottom: 10px;
            color: #2c3e50;
        }

        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .header-left {
            flex: 1;
        }

        .timezone-selector {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .timezone-selector label {
            font-size: 14px;
            color: #7f8c8d;
            font-weight: 500;
        }

        .timezone-selector select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
            cursor: pointer;
        }

        .timezone-selector select:focus {
            outline: none;
            border-color: #3498db;
        }

        .stats {
            display: flex;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }

        .stat-card {
            background: #ecf0f1;
            padding: 15px 20px;
            border-radius: 6px;
            flex: 1;
            min-width: 150px;
        }

        .stat-card.active {
            background: #3498db;
            color: white;
        }

        .stat-card h3 {
            font-size: 14px;
            text-transform: uppercase;
            opacity: 0.8;
            margin-bottom: 5px;
        }

        .stat-card .count {
            font-size: 28px;
            font-weight: bold;
        }

        .filters {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            transition: background 0.2s;
        }

        .btn-primary {
            background: #3498db;
            color: white;
        }

        .btn-primary:hover {
            background: #2980b9;
        }

        .btn-secondary {
            background: #95a5a6;
            color: white;
        }

        .btn-secondary:hover {
            background: #7f8c8d;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background: #34495e;
            color: white;
            font-weight: 600;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }

        .status-new {
            background: #3498db;
            color: white;
        }

        .status-read {
            background: #95a5a6;
            color: white;
        }

        .status-replied {
            background: #2ecc71;
            color: white;
        }

        .status-spam {
            background: #e74c3c;
            color: white;
        }

        .message-preview {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .pagination {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        select {
            padding: 6px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #95a5a6;
        }

        .details {
            background: #f8f9fa;
            padding: 15px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 14px;
        }

        .details strong {
            display: inline-block;
            width: 120px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-section">
            <div class="header-left">
                <h1>📬 Contact Form Submissions</h1>
                <p style="color: #7f8c8d;">Total submissions: <?= $totalCount ?></p>
            </div>
            <div class="timezone-selector">
                <label for="timezone">🌐 Timezone:</label>
                <select id="timezone" onchange="changeTimezone(this.value)">
                    <optgroup label="Common Timezones">
                        <option value="America/New_York" <?= $selectedTimezone === 'America/New_York' ? 'selected' : '' ?>>Eastern Time (EST/EDT)</option>
                        <option value="America/Chicago" <?= $selectedTimezone === 'America/Chicago' ? 'selected' : '' ?>>Central Time (CST/CDT)</option>
                        <option value="America/Denver" <?= $selectedTimezone === 'America/Denver' ? 'selected' : '' ?>>Mountain Time (MST/MDT)</option>
                        <option value="America/Los_Angeles" <?= $selectedTimezone === 'America/Los_Angeles' ? 'selected' : '' ?>>Pacific Time (PST/PDT)</option>
                        <option value="UTC" <?= $selectedTimezone === 'UTC' ? 'selected' : '' ?>>UTC</option>
                    </optgroup>
                    <optgroup label="All Timezones">
                        <?php
                        $timezones = DateTimeZone::listIdentifiers();
                        foreach ($timezones as $tz):
                            if (!in_array($tz, ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'])):
                        ?>
                            <option value="<?= $tz ?>" <?= $selectedTimezone === $tz ? 'selected' : '' ?>><?= $tz ?></option>
                        <?php
                            endif;
                        endforeach;
                        ?>
                    </optgroup>
                </select>
            </div>
        </div>

        <div class="stats">
            <a href="?status=all&tz=<?= urlencode($selectedTimezone) ?>" class="stat-card <?= $statusFilter === 'all' ? 'active' : '' ?>" style="text-decoration: none; color: inherit;">
                <h3>All</h3>
                <div class="count"><?= array_sum($statusCounts) ?></div>
            </a>
            <a href="?status=new&tz=<?= urlencode($selectedTimezone) ?>" class="stat-card <?= $statusFilter === 'new' ? 'active' : '' ?>" style="text-decoration: none; color: inherit;">
                <h3>New</h3>
                <div class="count"><?= $statusCounts['new'] ?? 0 ?></div>
            </a>
            <a href="?status=read&tz=<?= urlencode($selectedTimezone) ?>" class="stat-card <?= $statusFilter === 'read' ? 'active' : '' ?>" style="text-decoration: none; color: inherit;">
                <h3>Read</h3>
                <div class="count"><?= $statusCounts['read'] ?? 0 ?></div>
            </a>
            <a href="?status=replied&tz=<?= urlencode($selectedTimezone) ?>" class="stat-card <?= $statusFilter === 'replied' ? 'active' : '' ?>" style="text-decoration: none; color: inherit;">
                <h3>Replied</h3>
                <div class="count"><?= $statusCounts['replied'] ?? 0 ?></div>
            </a>
        </div>

        <?php if (empty($submissions)): ?>
            <div class="no-data">
                <p>No submissions found.</p>
            </div>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($submissions as $submission):
                        $dt = convertToTimezone($submission['submitted_at'], $selectedTimezone);
                    ?>
                        <tr>
                            <td><?= $submission['id'] ?></td>
                            <td>
                                <?= $dt->format('Y-m-d H:i:s') ?>
                                <br><small style="color: #95a5a6;"><?= $dt->format('T') ?></small>
                            </td>
                            <td><?= htmlspecialchars($submission['name']) ?></td>
                            <td><a href="mailto:<?= htmlspecialchars($submission['email']) ?>"><?= htmlspecialchars($submission['email']) ?></a></td>
                            <td><?= htmlspecialchars($submission['subject'] ?? 'N/A') ?></td>
                            <td>
                                <div class="message-preview"><?= htmlspecialchars($submission['message']) ?></div>
                                <details class="details">
                                    <summary style="cursor: pointer; margin-bottom: 10px;">View full message</summary>
                                    <div style="white-space: pre-wrap;"><?= htmlspecialchars($submission['message']) ?></div>
                                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                                    <strong>IP Address:</strong> <?= htmlspecialchars($submission['ip_address']) ?><br>
                                    <strong>User Agent:</strong> <?= htmlspecialchars($submission['user_agent']) ?>
                                </details>
                            </td>
                            <td>
                                <span class="status-badge status-<?= $submission['status'] ?>">
                                    <?= ucfirst($submission['status']) ?>
                                </span>
                            </td>
                            <td>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="id" value="<?= $submission['id'] ?>">
                                    <input type="hidden" name="update_status" value="1">
                                    <select name="status" onchange="this.form.submit()">
                                        <option value="new" <?= $submission['status'] === 'new' ? 'selected' : '' ?>>New</option>
                                        <option value="read" <?= $submission['status'] === 'read' ? 'selected' : '' ?>>Read</option>
                                        <option value="replied" <?= $submission['status'] === 'replied' ? 'selected' : '' ?>>Replied</option>
                                        <option value="spam" <?= $submission['status'] === 'spam' ? 'selected' : '' ?>>Spam</option>
                                    </select>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <?php if ($totalPages > 1): ?>
                <div class="pagination">
                    <?php if ($page > 1): ?>
                        <a href="?status=<?= $statusFilter ?>&page=<?= $page - 1 ?>&tz=<?= urlencode($selectedTimezone) ?>" class="btn btn-secondary">← Previous</a>
                    <?php endif; ?>

                    <span style="padding: 8px 16px;">Page <?= $page ?> of <?= $totalPages ?></span>

                    <?php if ($page < $totalPages): ?>
                        <a href="?status=<?= $statusFilter ?>&page=<?= $page + 1 ?>&tz=<?= urlencode($selectedTimezone) ?>" class="btn btn-secondary">Next →</a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>

    <script>
        function changeTimezone(timezone) {
            // Get current URL parameters
            const urlParams = new URLSearchParams(window.location.search);

            // Update timezone parameter
            urlParams.set('tz', timezone);

            // Redirect to new URL with updated timezone
            window.location.href = '?' + urlParams.toString();
        }
    </script>
</body>
</html>
