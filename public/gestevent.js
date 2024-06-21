export function initializeEventModal(eventId, eventsArray, themesData, formateursData, updateJsonData, buildTable) {
    const event = eventsArray.find(event => event.id === eventId);

    if (!event) {
        console.error("Événement non trouvé pour l'ID :", eventId);
        return;
    }

    $('#edit-theme').val(themesData[event.theme_id].name);
    $('#edit-date-debut').val(event.date_debut);
    $('#edit-date-fin').val(event.date_fin);
    $('#edit-ville').val(event.ville);
    $('#edit-choix').val(event.choix);
    $('#edit-methode').val(event.methode);
    $('#edit-formateurs').val(event.formateur_ids.map(id => `${formateursData[id].nom} ${formateursData[id].prenom}`).join(', '));
    $('#edit-event-id').val(event.id);

    $('#save-event-btn').off('click').on('click', function() {
        const updatedEventId = $('#edit-event-id').val();
        const updatedEventIndex = eventsArray.findIndex(event => event.id == updatedEventId);

        if (updatedEventIndex !== -1) {
            const updatedEvent = {
                ...eventsArray[updatedEventIndex],
                theme_id: Object.values(themesData).find(theme => theme.name === $('#edit-theme').val()).id,
                date_debut: $('#edit-date-debut').val(),
                date_fin: $('#edit-date-fin').val(),
                ville: $('#edit-ville').val(),
                choix: $('#edit-choix').val(),
                methode: $('#edit-methode').val(),
                formateur_ids: $('#edit-formateurs').val().split(', ').map(name => {
                    const [nom, prenom] = name.split(' ');
                    const formateur = Object.values(formateursData).find(f => f.nom === nom && f.prenom === prenom);
                    return formateur ? formateur.id : null;
                }).filter(id => id !== null)
            };

            eventsArray[updatedEventIndex] = updatedEvent;
            updateJsonData();
            buildTable(eventsArray);
            $('#eventModal').modal('hide');
        } else {
            console.error("Événement non trouvé pour l'ID :", updatedEventId);
        }
    });

    $('#delete-event-btn').off('click').on('click', function() {
        const deleteEventId = $('#edit-event-id').val();
        const deleteEventIndex = eventsArray.findIndex(event => event.id == deleteEventId);

        if (deleteEventIndex !== -1) {
            eventsArray.splice(deleteEventIndex, 1);
            updateJsonData();
            buildTable(eventsArray);
            $('#eventModal').modal('hide');
        } else {
            console.error("Événement non trouvé pour l'ID :", deleteEventId);
        }
    });
}
