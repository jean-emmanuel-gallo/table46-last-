$(document).ready(function() {
    let themesData = [];
    let formateursData = [];
    let eventsData = [];

    // Charger les données depuis le fichier JSON
    function fetchData() {
        return fetch('/db.json')
            .then(response => response.json())
            .then(db => {
                themesData = db.themes;
                formateursData = db.formateurs;
                eventsData = db.events || [];
                populateThemes();
                loadFormateurs();
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function populateThemes() {
        const themesSelect = $('#themes, #edit-themes');
        themesSelect.empty();
        themesData.forEach(theme => {
            const themeOption = $(`<option value="${theme.id}">${theme.name}</option>`);
            themesSelect.append(themeOption);
        });
    }

    function loadFormateurs() {
        const formateursList = $('#formateurs-list');
        formateursList.empty();
        formateursData.forEach(formateur => {
            const formateurItem = $(`<li class="formateur-item" data-formateur-id="${formateur.id}">${formateur.nom} ${formateur.prenom}</li>`);
            formateursList.append(formateurItem);
        });
    }

    function getNextFormateurId() {
        return formateursData.length > 0 ? Math.max(...formateursData.map(f => f.id)) + 1 : 1;
    }

    function addFormateur(nom, prenom, ville, cp, telephone, mail, adresse, themes) {
        const newFormateur = {
            id: getNextFormateurId(),
            nom: nom,
            prenom: prenom,
            ville: ville,
            CP: cp,
            téléphone: telephone,
            mail: mail,
            adresse: adresse,
            themes: themes
        };
        formateursData.push(newFormateur);
        updateJsonData();
        loadFormateurs();
    }

    function updateFormateur(id, nom, prenom, ville, cp, telephone, mail, adresse, themes) {
        const formateur = formateursData.find(f => f.id === id);
        if (formateur) {
            formateur.nom = nom;
            formateur.prenom = prenom;
            formateur.ville = ville;
            formateur.CP = cp;
            formateur.téléphone = telephone;
            formateur.mail = mail;
            formateur.adresse = adresse;
            formateur.themes = themes;
            updateJsonData();
            loadFormateurs();
        }
    }

    function updateJsonData() {
        return fetch('/db.json')
            .then(response => response.json())
            .then(db => {
                // Ajouter uniquement les nouveaux formateurs
                db.formateurs = db.formateurs.concat(formateursData.filter(f => !db.formateurs.some(df => df.id === f.id)));

                // Mettre à jour les données sur le serveur
                return fetch('/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ themes: db.themes, formateurs: db.formateurs, events: db.events })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Update successful:', data);
            })
            .catch(error => {
                console.error('Error updating data:', error);
            });
    }

    $('#add-formateur-form').on('submit', function(event) {
        event.preventDefault();
        const nom = $('#nom').val();
        const prenom = $('#prenom').val();
        const ville = $('#ville').val();
        const cp = $('#cp').val();
        const telephone = $('#telephone').val();
        const mail = $('#mail').val();
        const adresse = $('#adresse').val();
        const themes = $('#themes').val().map(Number);

        if (nom && prenom && ville && cp && telephone && mail && adresse && themes.length > 0) {
            addFormateur(nom, prenom, ville, cp, telephone, mail, adresse, themes);
            $('#add-formateur-form')[0].reset();
        } else {
            alert('Veuillez remplir tous les champs.');
        }
    });

    $('#formateurs-list').on('click', '.formateur-item', function() {
        const formateurId = $(this).data('formateur-id');
        const formateur = formateursData.find(f => f.id === formateurId);
        if (formateur) {
            $('#edit-nom').val(formateur.nom);
            $('#edit-prenom').val(formateur.prenom);
            $('#edit-ville').val(formateur.ville);
            $('#edit-cp').val(formateur.CP);
            $('#edit-telephone').val(formateur.téléphone);
            $('#edit-mail').val(formateur.mail);
            $('#edit-adresse').val(formateur.adresse);
            $('#edit-themes').val(formateur.themes);
            $('#editFormateurModal').data('formateur-id', formateurId).modal('show');
        }
    });

    $('#edit-formateur-form').on('submit', function(event) {
        event.preventDefault();
        const formateurId = $('#editFormateurModal').data('formateur-id');
        const nom = $('#edit-nom').val();
        const prenom = $('#edit-prenom').val();
        const ville = $('#edit-ville').val();
        const cp = $('#edit-cp').val();
        const telephone = $('#edit-telephone').val();
        const mail = $('#edit-mail').val();
        const adresse = $('#edit-adresse').val();
        const themes = $('#edit-themes').val().map(Number);

        if (nom && prenom && ville && cp && telephone && mail && adresse && themes.length > 0) {
            updateFormateur(formateurId, nom, prenom, ville, cp, telephone, mail, adresse, themes);
            $('#editFormateurModal').modal('hide');
        } else {
            alert('Veuillez remplir tous les champs.');
        }
    });

    fetchData();
});
