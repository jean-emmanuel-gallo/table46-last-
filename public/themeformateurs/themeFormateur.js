$(document).ready(function() {
    let themesData = [], formateursData = [], eventsData = [];

    // Fetch data from the server
    fetch('/db.json')
        .then(response => response.json())
        .then(db => {
            themesData = db.themes || [];
            formateursData = db.formateurs || [];
            eventsData = db.events || [];

            loadThemes();

            // Add search bar for themes
            const searchThemes = $(`
                <input type="text" id="searchThemes" placeholder="Rechercher thème" class="form-control mb-2">
            `);
            $('#themes-list').before(searchThemes);

            // Filter themes based on search input
            $('#searchThemes').on('input', function() {
                const searchText = $(this).val().toLowerCase();
                $('#themes-list li').each(function() {
                    const themeName = $(this).text().toLowerCase();
                    if (themeName.includes(searchText)) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });

            $('#themes-list').on('click', '.theme-item', function() {
                const themeId = $(this).data('theme-id');
                $('#themes-list .theme-item').removeClass('active');
                $(this).addClass('active');
                openThemeModal(themeId);
            });

            $('#themeModal').on('click', '.remove', function() {
                const formateurId = $(this).data('formateur-id');
                const themeId = $('#themeModal').data('theme-id');
                unassignFormateur(themeId, formateurId);
            });

            $('#saveThemeChanges').click(function() {
                const themeId = $('#themeModal').data('theme-id');
                saveThemeChanges(themeId);
            });

            $('#filterType').change(function() {
                const selectedType = $(this).val();
                loadThemes(selectedType);
            });

            $('#addNewThemeBtn').click(function() {
                $('#addThemeModal').modal('show');
            });

            $('#addThemeForm').submit(function(event) {
                event.preventDefault();
                addNewTheme();
            });

            $('#themeModal').on('click', '#assignFormateursBtn', function() {
                openAssignFormateursModal();
            });

            $('#availableFormateurs').on('change', 'input[type="checkbox"]', function() {
                toggleConfirmAssignButton();
            });

            $('#confirmAssignFormateurs').click(function() {
                const themeId = $('#themeModal').data('theme-id');
                assignSelectedFormateurs(themeId);
            });
        })
        .catch(error => console.error('Error fetching data:', error));

    // Load themes and display them
    function loadThemes(filterType = 'all') {
        const themesList = $('#themes-list');
        themesList.empty();
        themesData.forEach(theme => {
            if (filterType === 'all' || theme.type === filterType) {
                let isDark = isColorDark(theme.bck_color || '#fff');
                let textColor = isDark ? 'white' : 'black';
                const themeItem = $(`<li class="theme-item" data-theme-id="${theme.id}" style="background-color: ${theme.bck_color}; color: ${textColor};">${theme.name}</li>`);
                themesList.append(themeItem);
            }
        });
    }

    // Load formateurs for a given theme
    function loadFormateurs(themeId) {
        const assignedFormateursList = $('#assignedFormateurs');
        assignedFormateursList.empty();
        const assignedFormateurs = formateursData.filter(formateur => formateur.themes && formateur.themes.includes(themeId));
        assignedFormateurs.forEach(formateur => {
            const formateurItem = $(`<li>${formateur.nom} ${formateur.prenom} <span class="remove" data-formateur-id="${formateur.id}">❌</span></li>`);
            assignedFormateursList.append(formateurItem);
        });

        const availableFormateursList = $('#availableFormateurs');
        availableFormateursList.empty();
        const availableFormateurs = formateursData.filter(formateur => !formateur.themes || !formateur.themes.includes(themeId));
        availableFormateurs.sort((a, b) => a.nom.localeCompare(b.nom));
        availableFormateurs.forEach(formateur => {
            const formateurItem = $(`<li class="formateur-item"><input type="checkbox" data-formateur-id="${formateur.id}"> ${formateur.nom} ${formateur.prenom}</li>`);
            availableFormateursList.append(formateurItem);
        });

        updateAlphabetNav();
    }

    // Open the theme modal and load its details
    function openThemeModal(themeId) {
        const theme = themesData.find(t => t.id === themeId);
        if (!theme) return;

        $('#themeModal').data('theme-id', themeId);
        $('#themeName').val(theme.name);
        $('#themeType').val(theme.type);
        $('#themeColor').val(theme.bck_color);
        $('#themeDuration').val(theme.duration);

        loadFormateurs(themeId);

        $('#themeModal').modal('show');
    }

    // Save changes made to a theme
    function saveThemeChanges(themeId) {
        const theme = themesData.find(t => t.id === themeId);
        if (!theme) return;

        theme.name = $('#themeName').val();
        theme.type = $('#themeType').val();
        theme.bck_color = $('#themeColor').val();
        theme.duration = $('#themeDuration').val();

        updateJsonData();
        loadThemes($('#filterType').val());
        $('#themeModal').modal('hide');
    }

    // Add a new theme
    function addNewTheme() {
        const name = $('#newThemeName').val();
        const type = $('#newThemeType').val();
        const bck_color = $('#newThemeColor').val();
        const duration = $('#newThemeDuration').val();

        const newId = themesData.length > 0 ? Math.max(...themesData.map(theme => theme.id)) + 1 : 1;

        const newTheme = {
            id: newId,
            name: name,
            type: type,
            bck_color: bck_color,
            duration: parseInt(duration)
        };

        themesData.push(newTheme);
        updateJsonData();
        loadThemes($('#filterType').val());
        $('#addThemeModal').modal('hide');
    }

    // Open the modal to assign formateurs to a theme
    function openAssignFormateursModal() {
        const themeId = $('#themeModal').data('theme-id');
        if (!themeId) return;

        // Add search bar for formateurs
        const searchFormateurs = $(`
            <input type="text" id="searchFormateurs" placeholder="Rechercher formateur" class="form-control mb-2">
        `);
        $('#assignFormateursModal .modal-body').prepend(searchFormateurs);

        // Filter formateurs based on search input
        $('#searchFormateurs').on('input', function() {
            const searchText = $(this).val().toLowerCase();
            $('#availableFormateurs li').each(function() {
                const formateurName = $(this).text().toLowerCase();
                if (formateurName.includes(searchText)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });

        const availableFormateursList = $('#availableFormateurs');
        availableFormateursList.empty();
        const availableFormateurs = formateursData.filter(formateur => !formateur.themes || !formateur.themes.includes(themeId));
        availableFormateurs.sort((a, b) => a.nom.localeCompare(b.nom));
        availableFormateurs.forEach(formateur => {
            const formateurItem = $(`<li class="formateur-item"><input type="checkbox" data-formateur-id="${formateur.id}"> ${formateur.nom} ${formateur.prenom}</li>`);
            availableFormateursList.append(formateurItem);
        });

        updateAlphabetNav();
        toggleConfirmAssignButton();
        $('#assignFormateursModal').modal('show');
    }

    // Assign selected formateurs to a theme
    function assignSelectedFormateurs(themeId) {
        $('#availableFormateurs input[type="checkbox"]:checked').each(function() {
            const formateurId = $(this).data('formateur-id');
            assignFormateur(themeId, formateurId);
        });
        loadFormateurs(themeId);
        $('#assignFormateursModal').modal('hide');
    }

    // Assign a formateur to a theme
    function assignFormateur(themeId, formateurId) {
        const formateur = formateursData.find(formateur => formateur.id === formateurId);
        if (formateur && (!formateur.themes || !formateur.themes.includes(themeId))) {
            formateur.themes = formateur.themes || [];
            formateur.themes.push(themeId);
            updateJsonData();
            loadFormateurs(themeId);
        }
    }

    // Unassign a formateur from a theme and update events
    function unassignFormateur(themeId, formateurId) {
        const formateur = formateursData.find(formateur => formateur.id === formateurId);
        if (formateur) {
            formateur.themes = formateur.themes.filter(id => id !== themeId);

            // Update events to remove the formateur
            eventsData.forEach(event => {
                if (event.theme_id === themeId) {
                    event.formateur_ids = event.formateur_ids.filter(id => id !== formateurId);
                }
            });

            updateJsonData();
            loadFormateurs(themeId); // Reload formateurs after unassigning
        }
    }

    // Update the JSON data on the server
    function updateJsonData() {
        // Fetch existing data
        fetch('/db.json')
            .then(response => response.json())
            .then(existingData => {
                // Merge existing and updated events
                const updatedEvents = existingData.events.map(event => {
                    const updatedEvent = eventsData.find(e => e.id === event.id);
                    return updatedEvent ? updatedEvent : event;
                });

                // Add new events not in existing data
                eventsData.forEach(event => {
                    if (!existingData.events.some(e => e.id === event.id)) {
                        updatedEvents.push(event);
                    }
                });

                // Prepare updated data to send
                const updatedData = {
                    themes: themesData,
                    formateurs: formateursData,
                    events: updatedEvents
                };

                // Send merged data to server
                return fetch('/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
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

    // Check if a color is dark
    function isColorDark(color) {
        let r, g, b;
        if (color.match(/^rgb/)) {
            color = color.match(/rgba?\(([^)]+)\)/)[1];
            color = color.split(/ *, */).map(Number);
            [r, g, b] = color;
        } else if (color[0] === '#') {
            if (color.length === 4) {
                color = color.substr(1).split('').map(function (hex) {
                    return hex + hex;
                }).join('');
            } else {
                color = color.substr(1);
            }
            [r, g, b] = color.match(/.{2}/g).map(hex => parseInt(hex, 16));
        }
        let luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luma < 0.5;
    }

    // Toggle the confirm assign button
    function toggleConfirmAssignButton() {
        const isChecked = $('#availableFormateurs input[type="checkbox"]:checked').length > 0;
        $('#confirmAssignFormateurs').prop('disabled', !isChecked);
    }

    // Add a new theme with specific properties
    function addNewCustomTheme(name, type, bck_color, duration) {
        const newId = themesData.length > 0 ? Math.max(...themesData.map(theme => theme.id)) + 1 : 1;

        const newTheme = {
            id: newId,
            name: name,
            type: type,
            bck_color: bck_color,
            duration: parseInt(duration)
        };

        themesData.push(newTheme);
        updateJsonData();
        loadThemes($('#filterType').val());
    }

    // Function to validate theme data before saving
    function validateThemeData(theme) {
        if (!theme.name || !theme.type || !theme.bck_color || isNaN(theme.duration)) {
            alert("Veuillez remplir tous les champs du thème correctement.");
            return false;
        }
        return true;
    }

    // Function to fetch additional formateur details
    function fetchFormateurDetails(formateurId) {
        fetch(`/formateur/${formateurId}`)
            .then(response => response.json())
            .then(data => {
                console.log('Détails du formateur:', data);
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des détails du formateur:', error);
            });
    }

    // Function to highlight active themes
    function highlightActiveThemes() {
        $('#themes-list .theme-item').each(function() {
            const themeId = $(this).data('theme-id');
            if (eventsData.some(event => event.theme_id === themeId)) {
                $(this).addClass('active-theme');
            }
        });
    }

    // Function to update the alphabet navigation
    function updateAlphabetNav() {
        const alphabetNav = $('.alphabet-nav');
        alphabetNav.empty();

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        alphabet.unshift('TOUS');  // Ajouter "TOUS" au début

        alphabet.forEach(letter => {
            const button = $(`<button class="btn btn-light">${letter}</button>`);
            button.on('click', function() {
                filterFormateursByLetter(letter);
            });
            alphabetNav.append(button);
        });
    }

    // Function to filter formateurs by letter
    function filterFormateursByLetter(letter) {
        const availableFormateursList = $('#availableFormateurs');
        const formateurs = availableFormateursList.find('li');
        formateurs.show();  // Montrer tous les formateurs d'abord

        if (letter !== 'TOUS') {
            formateurs.each(function() {
                const formateurName = $(this).text().trim().toUpperCase();
                if (!formateurName.startsWith(letter)) {
                    $(this).hide();
                }
            });
        }
    }

    // Call additional setup function
    additionalSetup();
});
