const {body , validationResults} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const {pool} = require('pg');
require('dotenv').config();


// PostgreSQL Pool setup
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  secret: process.env.JWT_SECRET,
});

// Test DB connection
pool.connect()
    .then(() => console.log('Connected to PostegreSQL'))
    .catch(err => console.log('PostegreSQL connection error'));

app.post('register',
    [
        body('name').isEmpty.withMessage('Name is required'),
        body('email').isEmail.withMessage('Email is required'),
        body('password').isLength({min: 6}).withMessage('Password must be atleast 6 characters')
    ],
    async (req, res) => {
        const errors = validationResults(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array() });
        }

        const {name, email, password} = req.body;

        try {
            // check if user exists
            const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ message: 'Email already registered'});
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(paswword, 10);

            // Insert user
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