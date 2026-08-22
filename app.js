const path = require('path');
const { Pool } = require('pg');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategu = require('passport-local').Strategy;

const pool = new Pool({
    connectionString: "postgresql://luisitohc:2003283@localhost:5432/Auth-test",
})

passport.use(
    new LocalStrategu(async (username, password, done) => {
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
            const user = rows[0];
            if (!user) {
                return done(null, false, { message: "Incorrect username" })
            }
            if (user.password !== password) {
                return done(null, false, { message: "Incorrect password" })
            }
            return done(done, user);
        } catch (err) {
            return done(err)
        }
    })
)

passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser(async (id, done) => {
    try {
        const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = rows[0];
        done(null, user);
    } catch (err) {
        done(err);
    }
})

const app = express();
app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'ejs');

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get('/', async (req, res) => {
    const result = await (await pool.query('SELECT * FROM users')).rows
    res.render('index', { users: result })
});
app.get('/sing-up', (req, res) => res.render('sing-up-form'));
app.post('/sing-up', async (req, res, next) => {
    try {
        await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
            req.body.username,
            req.body.password,
        ]);
        res.redirect("/");
    } catch (err) {
        return next(err);
    }
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error) => {
    if (error) {
        throw error;
    }
    console.log(`App listening on port ${PORT}`);
});
