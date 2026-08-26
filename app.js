//1) Importar todas la librerias necesarias 
require('dotenv').config();                                     //variables de entorno
const path = require('path');                                  //creador de rutas 
const { Pool } = require('pg');                               //postrgreSQL DB
const express = require('express');                          //server-side framework 
const session = require('express-session');                 //manejador de sesiones
const passport = require('passport');                      //Autenticador     
const LocalStrategy = require('passport-local').Strategy; //strategia de Autenticacion
const bcrypt = require("bcryptjs");                      //Encriptador de claves

// 2) Connecion a las base de datos 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

// 3) Configuracion de Pasport

passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
            const user = rows[0];
            if (!user) {
                return done(null, false, { message: "Incorrect username" })
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return done(null, false, { message: "Incorrect password" })
            }
            return done(null, user);
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

// 4) Implementacion del seeervidor
const app = express();
// 5) Configuracion de las Views (interfaz)
app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'ejs');
// 6) configuracion del Middleware de Sesion
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, }));
// 7) Configuracion del middleware de auteticacon
app.use(passport.session());
// 8)  configuracion d middleware para analizar formularios
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// 9) Enrrutamiento
app.get('/', async (req, res) => res.render('index', { user: req.user }));
app.get('/sing-up', (req, res) => res.render('sing-up-form'));
app.post('/sing-up', async (req, res, next) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
            req.body.username,
            hashedPassword,
        ]);
        res.redirect("/");
    } catch (error) {
        console.error(error)
        return next(error);
    }
});
app.post("/log-in",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/",
        failureMessage: true,
    })
);
app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

// 10) Disposicion de un Puerto para ejecucoon el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, (error) => {
    if (error) {
        throw error;
    }
    console.log(`App listening on port ${PORT}`);
});
