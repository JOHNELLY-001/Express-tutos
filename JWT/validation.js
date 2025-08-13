// Validates and sanitizes user inputs
const {body , validationResults} = require('express-validator');
// Securely hashes passwords
const bcrypt = require('bcryptjs');
// Generates and verifies tokens for authentications
const jwt = require('jsonwebtoken');
// PostgreSQL client for connecting client and running queries
const {pool} = require('pg');
// Securely stores sensitive details (eg: passwords, tokens, ..)
require('dotenv').config();
// Creates express app for define routes
const app = express();
// Middleware to parse incoming  JSON requests
app.use(express.json());


// PostgreSQL Pool setup
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  secret: process.env.JWT_SECRET, //used to sign JWT tokens
});

// Test DB connection
pool.connect()
    .then(() => console.log('Connected to PostegreSQL'))
    .catch(err => console.log('PostegreSQL connection error'));

app.post('/register',
    [
        // Checks if name is empty
        body('name').isEmpty.withMessage('Name is required'), // OR body('name').isLength({min: 10}).withMessage("Name must be atleast 10 characters long"),
        body('email').isEmail.withMessage('Email is required'),
        body('password').isLength({min: 6}).withMessage('Password must be atleast 6 characters')
    ],

    async (req, res) => {
        // Validation check
        const errors = validationResults(req);
        // If there are errors execute the code block {} (condition in false "!errors.isEmpty()")
        if(!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array() });
        }

        const {name, email, password} = req.body;

        try {
            // check if user exists
            const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            // If the condition is True execute the code block {}
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ message: 'Email already registered'});
            }

            // Hash password (Prevents storing plain passwords)
            const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds, more rounds more secure but slower

            // Inserts user (name, email, hashedpassword) into PostgreSQL
            const result = await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hashedPassword]);

            // Generate JWT
            const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, {expiresIn: '1h' });

            res.json({ token, user: result.rows[0] });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error'); 
        }
    }
);

app.post('/login',
    async (req, res) => {
        const {name, email, password } = req.body;

        try {
            const results = pool.query('SELECT * FROM users WHERE name = $1', [name]);
            if (results.rows.length === 0 ) {
                return res.status(400).json({ error: "Invalid name or password"});
            }

            const user = results.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Invalid name or password"});
            }

            // generate JWT token
            const token = jwt.sign(
                { userId: user.id }, JWT_SECRET, {expiresIn: "1h"});
                res.json({token});
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);