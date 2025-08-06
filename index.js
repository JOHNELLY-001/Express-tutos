const express = require('express');
const {Pool} = require('pg');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = 3000;
app.use(cors());

app.use(express.json());

// PostgreSQL Pool setup
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Test DB connection
pool.connect()
    .then(() => console.log('Connected to PostegreSQL'))
    .catch(err => console.log('PostegreSQL connection error'));

// Sample route(home)
app.get('/', async (req, res) => {
    const result = await pool.query('SELECT NOW()');
    res.send(`Server is working, DB time: ${result.rows[0].now}`);
});

// Add user
app.post('/users', async (req, res) =>{
    const {name, email, password} = req.body;

    if (!email || !name) {
        return res.status(400).json({error: "name and email are required"});
    }

    try {
    const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, password]
    );
    res.status(201).json(result.rows[0]);
    } catch(err) {
        console.error(err.message);
        res.status(500).json({error: 'Internal server error'});
    }
});

// Get all users
app.get('/users', async (req, res) =>{
    try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({error: 'Internal server error'});
    }
});

// Add PUT method
app.put('/users/:id', async (req, res) =>{
    const {name, email, password} = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
            [name, email, password, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({error: 'User not found'});
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// Get a spsecific user
app.get('/users/:id', async(req, res) =>{
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1',
            [req.params.id]
        );
        if(result.rows.length === 0)
            return res.status(404).json({error :'User not found'});
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({error: 'Internal server error'});
    }
});

// DELETE a user
app.delete('/users/:id', async (req, res) =>{
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.json({message: 'User deleted'});
    } catch (err) {
        res.status(500).json({error: 'Internal server error'});
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});