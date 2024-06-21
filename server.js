const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware pour servir les fichiers statiques
app.use(express.static('public'));
app.use(express.json());

// Route pour servir db.json
app.get('/db.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'db.json'));
});

// Route pour mettre à jour db.json
app.post('/update', (req, res) => {
    const updatedData = req.body;
    fs.writeFile(path.join(__dirname, 'db.json'), JSON.stringify(updatedData, null, 2), (err) => {
        if (err) {
            res.status(500).send({ message: 'Failed to update data' });
        } else {
            res.send({ message: 'Data updated successfully' });
        }
    });
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
