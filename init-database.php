<?php
/**
 * Database Initialization Script
 * Run this script once to create the SQLite database
 */

define('DB_PATH', __DIR__ . '/data/contact_submissions.db');

try {
    // Create data directory if it doesn't exist
    $dataDir = dirname(DB_PATH);
    if (!file_exists($dataDir)) {
        mkdir($dataDir, 0755, true);
        echo "✓ Created data directory\n";
    }

    // Create database connection
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✓ Connected to SQLite database\n";

    // Create contact_submissions table
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
    echo "✓ Created contact_submissions table\n";

    // Create indexes
    $db->exec("
        CREATE INDEX IF NOT EXISTS idx_email
        ON contact_submissions(email)
    ");
    echo "✓ Created email index\n";

    $db->exec("
        CREATE INDEX IF NOT EXISTS idx_submitted_at
        ON contact_submissions(submitted_at)
    ");
    echo "✓ Created submitted_at index\n";

    $db->exec("
        CREATE INDEX IF NOT EXISTS idx_status
        ON contact_submissions(status)
    ");
    echo "✓ Created status index\n";

    // Set proper permissions on database file
    chmod(DB_PATH, 0644);
    echo "✓ Set database file permissions\n";

    // Set proper permissions on data directory
    chmod($dataDir, 0755);
    echo "✓ Set data directory permissions\n";

    echo "\n✅ Database initialized successfully!\n";
    echo "Database location: " . DB_PATH . "\n";

    // Show table structure
    $stmt = $db->query("PRAGMA table_info(contact_submissions)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "\nTable structure:\n";
    echo str_repeat("-", 60) . "\n";
    foreach ($columns as $column) {
        echo sprintf("%-20s %-15s %s\n",
            $column['name'],
            $column['type'],
            $column['notnull'] ? 'NOT NULL' : ''
        );
    }
    echo str_repeat("-", 60) . "\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
