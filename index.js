// require('dotenv').config({ path: '.env' });
const express = require('express');
const sql = require('mssql');
const path = require('path');
const app = express();

// Make sure to use this middleware to parse the form data
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.static('Public'));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    console.log(__dirname);
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.post('/submit-form', (req, res) => {
    console.log("Submit Form called");
    const { name, email, message } = req.body;

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
    };

    const pool = new sql.ConnectionPool(config);
    pool.connect()
        .then(() => {
            console.log("Connected to database.");
            const request = new sql.Request(pool);
            request.query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contact_form')
                BEGIN
                    CREATE TABLE contact_form (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        name NVARCHAR(255) NOT NULL,
                        email NVARCHAR(255) NOT NULL,
                        message NVARCHAR(MAX) NOT NULL
                    )
                END
            `)
                .then(() => {
                    console.log("Table created or already exists.");
                    request.input('name', sql.NVarChar(255), name);
                    request.input('email', sql.NVarChar(255), email);
                    request.input('message', sql.NVarChar(sql.MAX), message);
                    request.query('INSERT INTO contact_form (name, email, message) VALUES (@name, @email, @message)')
                        .then(() => {
                            res.redirect('/?formSubmitted=true#contact'); // Redirect to index.html with a URL parameter
                            pool.close();
                        })
                        .catch(err => {
                            res.send('Error inserting data: ' + err);
                            pool.close();
                        });
                })
                .catch(err => {
                    res.send('Error creating table: ' + err);
                    pool.close();
                });
        })
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});