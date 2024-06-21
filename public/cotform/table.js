document.addEventListener('DOMContentLoaded', () => {
    let currentEventId = null;

    fetch('/db.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const eventsArray = data.events;
            const themesData = Object.fromEntries(data.themes.map(theme => [theme.id, theme]));
            const formateursData = Object.fromEntries(data.formateurs.map(formateur => [formateur.id, formateur]));

            const eventsTableBody = document.querySelector('#eventsTable tbody');

            eventsArray.forEach(event => {
                const theme = themesData[event.theme_id];
                const formateurNames = event.formateur_ids.map(id => formateursData[id] ? `${formateursData[id].nom} ${formateursData[id].prenom}` : 'Aucun').join(', ');
                const choix = event.formateur_ids.length ? (event.choix ? event.choix : 'En attente') : 'En attente';

                const row = document.createElement('tr');

                row.innerHTML = `
                    <td style="background-color: ${theme.bck_color || '#fff'};">${theme.name}</td>
                    <td>${event.date_debut}</td>
                    <td>${event.date_fin}</td>
                    <td>${event.ville}</td>
                    <td>${event.finan}</td>
                    <td>${formateurNames}</td>
                    <td class="choix-cell" data-event-id="${event.id}">${choix}</td>
                    <td>${event.num_s}</td>
                `;

                eventsTableBody.appendChild(row);
            });

            document.querySelectorAll('.choix-cell').forEach(cell => {
                cell.addEventListener('click', (e) => {
                    currentEventId = e.target.getAttribute('data-event-id');
                    $('#choixModal').modal('show');
                });
            });

            document.getElementById('accept-btn').addEventListener('click', () => {
                updateEventChoix(currentEventId, 'Accepté');
            });

            document.getElementById('refuse-btn').addEventListener('click', () => {
                updateEventChoix(currentEventId, 'Refusé');
            });

            function updateEventChoix(eventId, choix) {
                const event = eventsArray.find(event => event.id == eventId);
                if (event) {
                    if (!event.formateur_ids.length) {
                        alert('Impossible de changer le choix car aucun formateur n\'est assigné à cet événement.');
                        return;
                    }
                    event.choix = choix;
                    updateJsonData();
                    document.querySelector(`.choix-cell[data-event-id="${eventId}"]`).innerText = choix;
                    $('#choixModal').modal('hide');
                }
            }

            function updateJsonData() {
                fetch('/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ events: eventsArray, themes: Object.values(themesData), formateurs: Object.values(formateursData) })
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
            }
        })
        .catch(error => console.error('Error fetching data:', error));
});
