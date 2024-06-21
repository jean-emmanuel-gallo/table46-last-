import { initializeEventModal } from './gestevent.js';

$(function() {
    let eventsArray = [];
    let themesData = {};
    let formateursData = {};
    let lastEventId = 0;
    let currentYear = new Date().getFullYear();
    let currentMonth = 'all';

    // Charger les données depuis le serveur
    fetchJsonData();

    // Initialiser les datepickers
    $(".datepicker").datepicker({
        dateFormat: "dd/mm/yy"
    });

    // Initialiser la navigation par mois et année
    updateNavigation();

    function updateNavigation() {
        $('#current-year').text(currentYear);
        $('#current-month').text(currentMonth === 'all' ? 'Tous' : new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }));
        renderMonthButtons();
    }

    $('#prev-year-btn').on('click', function() {
        currentYear--;
        saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
        updateNavigation();
    });

    $('#next-year-btn').on('click', function() {
        currentYear++;
        saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
        updateNavigation();
    });

    $('#prev-month-btn').on('click', function() {
        if (currentMonth === 1) {
            currentMonth = 12;
            currentYear--;
        } else {
            currentMonth--;
        }
        saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
        updateNavigation();
    });

    $('#next-month-btn').on('click', function() {
        if (currentMonth === 12) {
            currentMonth = 1;
            currentYear++;
        } else {
            currentMonth++;
        }
        saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
        updateNavigation();
    });

    function renderMonthButtons() {
        let monthsContainer = $('#months-container');
        monthsContainer.empty();

        let hasYearEvents = eventsArray.some(event => {
            let [day, monthStr, yearStr] = event.date_debut.split('/');
            return parseInt(yearStr) === currentYear;
        });

        let allEventsButton = $(`<button class="month-btn ${hasYearEvents ? 'has-events' : ''}" data-month="all">Tous</button>`);
        allEventsButton.on('click', function() {
            currentMonth = 'all';
            saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
            updateNavigation();
        });
        monthsContainer.append(allEventsButton);

        for (let month = 1; month <= 12; month++) {
            let monthName = new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' });
            let hasEvents = eventsArray.some(event => {
                let [day, monthStr, yearStr] = event.date_debut.split('/');
                return parseInt(yearStr) === currentYear && parseInt(monthStr) === month;
            });

            let monthButton = $(`<button class="month-btn ${hasEvents ? 'has-events' : ''}" data-month="${month}">${monthName.substring(0, 3)}</button>`);
            monthButton.on('click', function() {
                currentMonth = $(this).data('month');
                saveAndBuildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
                updateNavigation();
            });
            monthsContainer.append(monthButton);
        }
    }

    function filterByYearAndMonth(events, year, month) {
        if (month === 'all') {
            return events.filter(event => {
                let [day, monthStr, yearStr] = event.date_debut.split('/');
                return parseInt(yearStr) === year;
            });
        }
        return events.filter(event => {
            let [day, monthStr, yearStr] = event.date_debut.split('/');
            return parseInt(yearStr) === year && parseInt(monthStr) === month;
        });
    }

    $('#new-date-debut').on('change', function() {
        let startDate = $(this).datepicker('getDate');
        if (startDate) {
            let selectedThemeName = $('#new-theme').val();
            let selectedTheme = Object.values(themesData).find(theme => theme.name === selectedThemeName);
            let endDate = new Date(startDate.getTime());
            if (selectedTheme) {
                if (selectedTheme.duration === 2) {
                    let dayOfWeek = startDate.getDay();
                    if (dayOfWeek !== 2 && dayOfWeek !== 4) { // Vérifier si le jour est mardi (2) ou jeudi (4)
                        alert("Les thèmes de deux jours doivent commencer un mardi ou un jeudi.");
                        $('#new-date-debut').val(''); // Réinitialiser la date de début
                        $('#new-date-fin').val(''); // Réinitialiser la date de fin
                        return;
                    }
                    endDate.setDate(endDate.getDate() + 1);
                }
                let formattedEndDate = `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
                $('#new-date-fin').val(formattedEndDate);
            }
        }
    });

    $('#new-theme, #new-date-debut, #new-date-fin, #new-ville').on('change', function() {
        let selectedThemeName = $('#new-theme').val();
        let selectedTheme = Object.values(themesData).find(theme => theme.name === selectedThemeName);
        let startDate = $('#new-date-debut').datepicker('getDate');
        let endDate = $('#new-date-fin').datepicker('getDate');
        let ville = $('#new-ville').val();

        if (selectedTheme && startDate && endDate && ville) {
            let availableFormateurs = getAvailableFormateurs(selectedTheme.id, startDate, endDate);
            populateFormateursDropdown(availableFormateurs);
            $('#new-forma').prop('disabled', false);
        } else {
            $('#new-forma').prop('disabled', true);
        }
    });

    function getAvailableFormateurs(themeId, startDate, endDate) {
        return Object.values(formateursData).filter(formateur => {
            return isFormateurAssignedToTheme(formateur, themeId) && isFormateurAvailableForDates(formateur.id, startDate, endDate);
        });
    }

    function populateFormateursDropdown(formateurs) {
        let formateursDropdown = $('#new-forma');
        formateursDropdown.empty();
        formateurs.forEach(formateur => {
            formateursDropdown.append(`<option value="${formateur.id}">${formateur.nom} ${formateur.prenom}</option>`);
        });
    }

    function isFormateurAvailableForDates(formateurId, newStartDate, newEndDate) {
        for (let existingEvent of eventsArray) {
            if (existingEvent.formateur_ids && existingEvent.formateur_ids.includes(formateurId)) {
                let eventStartDate = new Date(existingEvent.date_debut.split('/').reverse().join('-'));
                let eventEndDate = new Date(existingEvent.date_fin.split('/').reverse().join('-'));
                if ((newStartDate <= eventEndDate && newStartDate >= eventStartDate) ||
                    (newEndDate <= eventEndDate && newEndDate >= eventStartDate) ||
                    (newStartDate <= eventStartDate && newEndDate >= eventEndDate)) {
                    return false;
                }
            }
        }
        return true;
    }

    $('#new-theme').on('change', function() {
        let selectedThemeName = $(this).val();
        let selectedTheme = Object.values(themesData).find(theme => theme.name === selectedThemeName);
        if (selectedTheme) {
            $('#new-finan').val(selectedTheme.type);
            $('#new-date-debut').val('');
            $('#new-date-fin').val('');
        }
    });

    function showAvailableFormateursForEvent(eventId) {
        updateAvailableFormateurs(eventId);

        let eventElement = $(`[data-event-id="${eventId}"]`);
        let offset = eventElement.offset();

        $('#formateurs-list-container').css({
            top: offset.top,
            left: offset.left + eventElement.outerWidth()
        }).show();

        lockOtherEvents(eventId);
    }

    function updateAvailableFormateurs(eventId) {
        let event = eventsArray.find(event => event.id == eventId);
        if (event) {
            let themeId = event.theme_id;
            let formateursList = $('#formateurs-list');
            formateursList.empty();
            for (let formateur of Object.values(formateursData)) {
                if (isFormateurAvailableForEvent(formateur.id, event) && isFormateurAssignedToTheme(formateur, themeId)) {
                    formateursList.append(`<li class="formateur-item" data-formateur-id="${formateur.id}">${formateur.nom} ${formateur.prenom}</li>`);
                }
            }
            makeDraggableFormateurs();
        }
    }

    function lockOtherEvents(currentEventId) {
        $('.event-row').each(function() {
            let eventId = $(this).data('event-id');
            if (eventId !== currentEventId) {
                $(this).addClass('locked-event');
            }
        });
    }

    function unlockOtherEvents() {
        $('.event-row').removeClass('locked-event');
    }

    function attachRowClickEvents() {
        $('.event-row').off('click').on('click', function() {
            let eventId = $(this).data('event-id');
            initializeEventModal(eventId, eventsArray, themesData, formateursData, updateJsonData, buildTable);
            $('#eventModal').modal('show');
        });

        $('.add-formateur-btn').off('click').on('click', function(event) {
            event.stopPropagation();
            let eventId = $(this).data('event-id');
            showAvailableFormateursForEvent(eventId);
        });

        $('.remove-formateur-btn').off('click').on('click', function(event) {
            event.stopPropagation();
            let eventId = $(this).data('event-id');
            let formateurId = $(this).data('formateur-id');
            if (eventId !== undefined && formateurId !== undefined) {
                let eventIndex = eventsArray.findIndex(event => event.id == eventId);
                if (eventIndex !== -1) {
                    let formateurIndex = eventsArray[eventIndex].formateur_ids.indexOf(formateurId);
                    if (formateurIndex !== -1) {
                        saveScrollPosition();
                        eventsArray[eventIndex].formateur_ids.splice(formateurIndex, 1);
                        updateJsonData().then(() => {
                            restoreScrollPosition();
                            buildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
                            unlockOtherEvents();
                        });
                    }
                } else {
                    console.error("Événement non trouvé pour l'ID :", eventId);
                }
            } else {
                console.error("ID de l'événement ou du formateur indéfini :", eventId, formateurId);
            }
        });

        $(document).on('click', function(event) {
            if (!$(event.target).closest('#formateurs-list-container, .add-formateur-btn').length) {
                $('#formateurs-list-container').hide();
                unlockOtherEvents();
            }
        });

        $(document).on('keydown', function(event) {
            if (event.key === 'Escape') {
                $('#formateurs-list-container').hide();
                unlockOtherEvents();
            }
        });
    }

    $('#add-event-btn').on('click', function() {
        $('#addEventModal').modal('show');
        populateThemesList();
        populateFormateursList();
    });

    $('#add-theme-form').on('submit', function(event) {
        event.preventDefault();
        let newThemeName = $('#new-theme').val();
        let newDateDebut = $('#new-date-debut').val();
        let newDateFin = $('#new-date-fin').val();
        let newVille = $('#new-ville').val();
        let newChoix = $('#new-choix').val();
        let newForma = $('#new-forma').val();
        let newMethode = $('#new-methode').val();
    
        let theme = Object.values(themesData).find(theme => theme.name === newThemeName);
        let formateur = newForma ? Object.values(formateursData).find(formateur => `${formateur.nom} ${formateur.prenom}` === newForma) : null;
    
        if (!theme || !newDateDebut || !newDateFin || !newVille || !newMethode) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }
    
        let lastSessionNumber = getLastSessionNumber(eventsArray);
        const generateNextSessionNumber = () => lastSessionNumber + 1;
        let newNumSession = generateNextSessionNumber();
        let newEventId = generateNextEventId();
    
        let newEntry = {
            id: newEventId,
            theme_id: theme.id,
            date_debut: newDateDebut,
            date_fin: newDateFin,
            ville: newVille,
            choix: newChoix,
            methode: newMethode,
            formateur_ids: formateur ? [formateur.id] : [],
            num_s: newNumSession
        };
    
        if (isDuplicateEvent(newEntry, eventsArray)) {
            alert("Un événement avec le même numéro de session ou un formateur déjà réservé existe.");
            return;
        }
    
        if (formateur && !isFormateurAssignedToTheme(formateur, theme.id)) {
            alert("Le formateur sélectionné n'est pas assigné au thème.");
            return;
        }
    
        saveScrollPosition();
        eventsArray.push(newEntry);
        console.log("Nouvel événement ajouté :", newEntry);  // Log ajouté pour débogage
        updateJsonData().then(() => {
            restoreScrollPosition();
            buildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
        });
        $('#add-theme-form').trigger("reset");
        $('#addEventModal').modal('hide');
        alert("Événement ajouté avec succès.");
    });
    
// Fonction pour envoyer les données mises à jour au serveur
function updateJsonData() {
    console.log("Envoi des données mises à jour au serveur...");

    return fetch('/db.json')
        .then(response => response.json())
        .then(existingData => {
            console.log("Données existantes récupérées :", existingData);

            const mergedData = {
                events: [...eventsArray],
                themes: Object.values(themesData),
                formateurs: Object.values(formateursData)
            };

            console.log("Données fusionnées à envoyer :", mergedData);

            return fetch('/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mergedData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Réponse du serveur :", data.message);
        })
        .catch((error) => {
            console.error('Erreur lors de la mise à jour des données :', error);
        });
}

    function sortEventsByStartDate(events) {
        return events.sort((a, b) => {
            let dateA = new Date(a.date_debut.split('/').reverse().join('-'));
            let dateB = new Date(b.date_debut.split('/').reverse().join('-'));
            return dateA - dateB;
        });
    }

    function fetchJsonData() {
        fetch('/db.json')
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Erreur HTTP ! Statut : ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                console.log('Données récupérées :', data);

                if (!data.events) {
                    console.error('data.events est indéfini');
                } else if (!Array.isArray(data.events)) {
                    console.error('data.events n\'est pas un tableau');
                } else {
                    console.log('data.events est valide');
                    eventsArray = data.events;
                }

                if (!data.themes) {
                    console.error('data.themes est indéfini');
                } else if (!Array.isArray(data.themes)) {
                    console.error('data.themes n\'est pas un tableau');
                } else {
                    console.log('data.themes est valide');
                    themesData = Object.fromEntries(data.themes.map(theme => [theme.id, theme]));
                }

                if (!data.formateurs) {
                    console.error('data.formateurs est indéfini');
                } else if (!Array.isArray(data.formateurs)) {
                    console.error('data.formateurs n\'est pas un tableau');
                } else {
                    console.log('data.formateurs est valide');
                    formateursData = Object.fromEntries(data.formateurs.map(formateur => [formateur.id, formateur]));
                }

                if (eventsArray.length > 0) {
                    lastEventId = Math.max(...eventsArray.map(event => event.id), 0);
                }

                console.log('Événements :', eventsArray);
                console.log('Thèmes :', themesData);
                console.log('Formateurs :', formateursData);

                currentMonth = 'all';

                eventsArray = sortEventsByStartDate(eventsArray);

                buildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
                populateFormateursList();
                updateNavigation();
                attachRowClickEvents();
            })
            .catch((error) => {
                console.error("Impossible de récupérer les données :", error);
            });
    }

    $('#filter-dates-btn').on('click', function() {
        let startDate = $('#date-debut-input').datepicker('getDate');
        let endDate = $('#date-fin-input').datepicker('getDate');
        if (startDate && endDate) {
            let filteredData = filterByDate(startDate, endDate, eventsArray);
            saveAndBuildTable(filteredData);
        } else {
            alert('Veuillez sélectionner des dates valides.');
        }
    });

    function makeDraggableFormateurs() {
        $(".formateur-item").draggable({
            helper: "clone",
            revert: "invalid"
        });
    }

    function makeDroppableEvents() {
        $(".formateur-cell").droppable({
            accept: ".formateur-item",
            drop: function(event, ui) {
                let formateurId = $(ui.helper).data("formateur-id");
                let eventId = $(this).data("event-id");

                let eventIndex = eventsArray.findIndex(event => event.id == eventId);
                if (eventIndex !== -1) {
                    if (isFormateurAvailableForEvent(formateurId, eventsArray[eventIndex])) {
                        if (isFormateurAssignedToTheme(formateursData[formateurId], eventsArray[eventIndex].theme_id)) {
                            if (eventsArray[eventIndex].formateur_ids.length < 3) {
                                saveScrollPosition();
                                eventsArray[eventIndex].formateur_ids.push(formateurId);
                                updateJsonData().then(() => {
                                    restoreScrollPosition();
                                    buildTable(filterByYearAndMonth(eventsArray, currentYear, currentMonth));
                                    updateAvailableFormateurs(eventId);
                                });
                            } else {
                                alert("Vous ne pouvez pas ajouter plus de 3 formateurs.");
                            }
                        } else {
                            alert("Le formateur n'est pas assigné à ce thème.");
                        }
                    } else {
                        alert("Le formateur n'est pas disponible pour les dates sélectionnées.");
                    }
                } else {
                    console.error("Événement non trouvé pour l'ID :", eventId);
                }
            }
        });
    }

    $('#themes-input').on('input', function() {
        let value = $(this).val();
        let data = searchTheme(value, eventsArray);
        saveAndBuildTable(data);
    });

    $('#choix-input').on('input', function() {
        let value = $(this).val();
        let data = searchChoix(value, eventsArray);
        saveAndBuildTable(data);
    });

    $('#formateur-input').on('input', function() {
        let value = $(this).val();
        let data = searchForma(value, eventsArray);
        saveAndBuildTable(data);
    });

    $('#ville-input').on('input', function() {
        let value = $(this).val();
        let data = searchVille(value, eventsArray);
        saveAndBuildTable(data);
    });

    $('#num-session-input').on('input', function() {
        let value = $(this).val();
        let data = searchNumSession(value, eventsArray);
        saveAndBuildTable(data);
    });

    function filterByDate(startDate, endDate, data) {
        return data.filter(event => {
            let eventStartDate = new Date(event.date_debut.split('/').reverse().join('-'));
            let eventEndDate = new Date(event.date_fin.split('/').reverse().join('-'));
            return eventStartDate >= startDate && eventEndDate <= endDate;
        });
    }

    $('#methode-input').on('change', function() {
        let value = $(this).val();
        let data = filterByMethode(value, eventsArray);
        saveAndBuildTable(data);
    });

    function filterByMethode(value, data) {
        if (!value) {
            return data; 
        }
        return data.filter(event => event.methode === value);
    }

    $('th').on('click', function() {
        let column = $(this).data('colname');
        let order = $(this).data('order') || 'asc';
        let thElement = $(this);

        $('th').not(this).data('order', null).each(function() {
            let headerText = $(this).text().replace(' ▼', '').replace(' ▲', '');
            $(this).text(headerText);
        });

        let filteredEvents = filterByYearAndMonth(eventsArray, currentYear, currentMonth);

        const compare = (a, b, column, order) => {
            let valA = a[column] || '';
            let valB = b[column] || '';

            if (column === 'num_s') {
                valA = Number(valA);
                valB = Number(valB);
            } else if (column.includes('date')) {
                valA = new Date(valA.split('/').reverse().join('-'));
                valB = new Date(valB.split('/').reverse().join('-'));
            } else if (column === 'choix') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            } else if (column === 'formateurs') {
                valA = a.formateur_ids.map(id => formateursData[id]?.nom + ' ' + formateursData[id]?.prenom).join(', ').toLowerCase();
                valB = b.formateur_ids.map(id => formateursData[id]?.nom + ' ' + formateursData[id]?.prenom).join(', ').toLowerCase();
            } else {
                valA = valA.toString();
                valB = valB.toString();
            }

            if (order === 'asc') {
                if (valA < valB) return -1;
                if (valA > valB) return 1;
                return 0;
            } else {
                if (valA > valB) return -1;
                if (valA < valB) return 1;
                return 0;
            }
        };

        if (order === 'desc') {
            filteredEvents = filteredEvents.sort((a, b) => compare(a, b, column, 'asc'));
            thElement.data("order", "asc");
            thElement.text(thElement.text().replace(' ▼', '') + ' ▲');
        } else {
            filteredEvents = filteredEvents.sort((a, b) => compare(a, b, column, 'desc'));
            thElement.data("order", "desc");
            thElement.text(thElement.text().replace(' ▲', '') + ' ▼');
        }

        saveAndBuildTable(filteredEvents);
    });

    function populateThemesList() {
        let themesList = $('#themes-list');
        themesList.empty();
        for (let theme of Object.values(themesData)) {
            themesList.append(`<option value="${theme.name}">`);
        }
    }

    function populateFormateursList() {
        let formateursList = $('#formateurs-list');
        formateursList.empty();
        for (let formateur of Object.values(formateursData)) {
            formateursList.append(`<li class="formateur-item" data-formateur-id="${formateur.id}">${formateur.nom} ${formateur.prenom}</li>`);
        }
        makeDraggableFormateurs();
    }

    function isFormateurAssignedToTheme(formateur, themeId) {
        return formateur.themes.includes(themeId);
    }

    function isFormateurAvailableForEvent(formateurId, newEvent) {
        for (let existingEvent of eventsArray) {
            if (existingEvent.formateur_ids && existingEvent.formateur_ids.includes(formateurId)) {
                let eventStartDate = new Date(existingEvent.date_debut.split('/').reverse().join('-'));
                let eventEndDate = new Date(existingEvent.date_fin.split('/').reverse().join('-'));
                let newStartDate = new Date(newEvent.date_debut.split('/').reverse().join('-'));
                let newEndDate = new Date(newEvent.date_fin.split('/').reverse().join('-'));
                if ((newStartDate <= eventEndDate && newStartDate >= eventStartDate) ||
                    (newEndDate <= eventEndDate && newEndDate >= eventStartDate) ||
                    (newStartDate <= eventStartDate && newEndDate >= eventEndDate)) {
                    return false;
                }
            }
        }
        return true;
    }

    function saveScrollPosition() {
        window.sessionStorage.setItem('scrollTop', $(window).scrollTop());
        window.sessionStorage.setItem('scrollLeft', $(window).scrollLeft());
    }

    function restoreScrollPosition() {
        const scrollTop = window.sessionStorage.getItem('scrollTop');
        const scrollLeft = window.sessionStorage.getItem('scrollLeft');
        if (scrollTop !== null && scrollLeft !== null) {
            $(window).scrollTop(scrollTop);
            $(window).scrollLeft(scrollLeft);
        }
    }

    function saveAndBuildTable(data) {
        saveScrollPosition();
        buildTable(data);
        restoreScrollPosition();
    }

    function buildTable(data) {
        let table = document.getElementById('myTable');
        table.innerHTML = '';
        for (let i = 0; i < data.length; i++) {
            let event = data[i];
            let theme = themesData[event.theme_id];

            if (!Array.isArray(event.formateur_ids)) {
                console.error(`event.formateur_ids is not an array for event id ${event.id}`);
                event.formateur_ids = [];
            }

            let formateurs = event.formateur_ids.map(id => formateursData[id]);

            formateurs = formateurs.filter(formateur => formateur !== undefined);

            let formateursHtml = formateurs.map(formateur =>
                `${formateur.nom} ${formateur.prenom} <button class="btn btn-link remove-formateur-btn" data-event-id="${event.id}" data-formateur-id="${formateur.id}">❌</button>`
            ).join('<br>');

            let choixCell = event.choix ? event.choix : "En attente";

            let choixColor = "";
            if (choixCell.toLowerCase() === "accepté") {
                choixColor = "style='background-color: green;'";
            } else if (choixCell.toLowerCase() === "refusé") {
                choixColor = "style='background-color: red;'";
            }

            let isDark = isColorDark(theme.bck_color || '#fff');
            let textColor = isDark ? 'white' : 'black';

            function getDayOfWeek(dateStr) {
                let [day, month, year] = dateStr.split('/');
                let date = new Date(`${year}-${month}-${day}`);
                return date.toLocaleString('default', { weekday: 'long' });
            }

            let startDayOfWeek = getDayOfWeek(event.date_debut);
            let endDayOfWeek = getDayOfWeek(event.date_fin);

            let row = `<tr class="event-row" data-event-id="${event.id}">
                <td style="background-color: ${theme.bck_color || '#fff'}; color: ${textColor};">${theme.name}</td>
                <td>${startDayOfWeek} ${event.date_debut}</td>
                <td>${endDayOfWeek} ${event.date_fin}</td>
                <td>${event.ville}</td>
                <td>${theme.type}</td>
                <td>${event.methode}</td>
                <td class="formateur-cell" data-event-id="${event.id}">${formateursHtml}<button class="btn btn-link add-formateur-btn" data-event-id="${event.id}">Ajouter formateur</button></td>
                <td ${choixColor}>${choixCell}</td>
                <td>${event.num_s}</td>
            </tr>`;
            table.innerHTML += row;
        }
        attachRowClickEvents();
        makeDroppableEvents();
    }

    function searchTheme(value, data) {
        let filteredTheme = [];
        value = value.toLowerCase();
        for (let i = 0; i < data.length; i++) {
            let theme = themesData[data[i].theme_id].name.toLowerCase();
            if (theme.includes(value)) {
                filteredTheme.push(data[i]);
            }
        }
        return filteredTheme;
    }

    function searchChoix(value, data) {
        if (value.toLowerCase() === "tous") {
            return data;
        }

        let filteredChoix = [];
        value = value.toLowerCase();
        for (let i = 0; i < data.length; i++) {
            let choix = data[i].choix ? data[i].choix.toLowerCase() : 'en attente';
            if (choix.includes(value)) {
                filteredChoix.push(data[i]);
            }
        }
        return filteredChoix;
    }

    $('#choix-input').on('change', function() {
        let value = $(this).val();
        let data = searchChoix(value, eventsArray);
        saveAndBuildTable(data);
    });

    function searchForma(value, data) {
        let filteredForma = [];
        value = value.toLowerCase();
        for (let i = 0; i < data.length; i++) {
            let formateurs = data[i].formateur_ids.map(id => formateursData[id]);
            let formateurName = formateurs.map(formateur => `${formateur.nom} ${formateur.prenom}`.toLowerCase()).join(' ');
            if (formateurName.includes(value)) {
                filteredForma.push(data[i]);
            }
        }
        return filteredForma;
    }

    function searchVille(value, data) {
        let filteredVille = [];
        value = value.toLowerCase();
        for (let i = 0; i < data.length; i++) {
            let ville = data[i].ville.toLowerCase();
            if (ville.includes(value)) {
                filteredVille.push(data[i]);
            }
        }
        return filteredVille;
    }

    function searchNumSession(value, data) {
        let filteredNumSession = [];
        value = value.toLowerCase();
        for (let i = 0; i < data.length; i++) {
            let numSession = (data[i].num_s || '').toString().toLowerCase();
            if (numSession.includes(value)) {
                filteredNumSession.push(data[i]);
            }
        }
        return filteredNumSession;
    }

    function isDuplicateEvent(newEvent, eventsArray) {
        for (let event of eventsArray) {
            for (let formateurId of newEvent.formateur_ids) {
                if (event.formateur_ids.includes(formateurId)) {
                    let eventStartDate = new Date(event.date_debut.split('/').reverse().join('-'));
                    let eventEndDate = new Date(event.date_fin.split('/').reverse().join('-'));
                    let newStartDate = new Date(newEvent.date_debut.split('/').reverse().join('-'));
                    let newEndDate = new Date(newEvent.date_fin.split('/').reverse().join('-'));
                    if ((newStartDate <= eventEndDate && newStartDate >= eventStartDate) ||
                        (newEndDate <= eventEndDate && newEndDate >= eventStartDate)) {
                        return true;
                    }
                }
            }
            if (event.num_s === newEvent.num_s) {
                return true;
            }
        }
        return false;
    }

    const getLastSessionNumber = (events) => {
        let lastSessionNumber = 0;
        for (let event of events) {
            if (event.num_s > lastSessionNumber) {
                lastSessionNumber = event.num_s;
            }
        }
        return lastSessionNumber;
    };

    const generateNextEventId = () => ++lastEventId;

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
});
