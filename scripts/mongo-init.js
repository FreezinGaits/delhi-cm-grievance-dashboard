// MongoDB initialization script for Docker
// This runs on first container startup

db = db.getSiblingDB('grievance_db');

// Create application user
db.createUser({
  user: 'grievance_app',
  pwd: 'app_password_123',
  roles: [
    { role: 'readWrite', db: 'grievance_db' },
  ],
});

// Create initial collections with validation
db.createCollection('users');
db.createCollection('departments');
db.createCollection('complaints');
db.createCollection('complainthistories');
db.createCollection('complaintclusters');
db.createCollection('visitlogs');
db.createCollection('auditlogs');
db.createCollection('notifications');
db.createCollection('assignments');
db.createCollection('officermetrics');
db.createCollection('departmentmetrics');

print('MongoDB initialization complete: grievance_db created with all collections');
