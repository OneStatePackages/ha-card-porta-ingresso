### Installazione tramite HACS

Se vuoi installare automaticamente la **Custom Card Porta Ingresso** tramite HACS, segui questi semplici passaggi:

## 1. Aggiungere il repository a HACS

1. Vai su **HACS** nel tuo Home Assistant.
2. Clicca su **Integrazioni** nel menu di sinistra.
3. Clicca sul pulsante con i tre puntini in alto a destra e seleziona **Aggiungi Repository**.
4. Inserisci il seguente URL del repository:
   ```
   https://github.com/OneStatePackages/ha-card-porta-ingresso
   ```
5. oppure premi il tasto qui sotto

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=OneStatePackages+&repository=https%3A%2F%2Fgithub.com%2FOneStatePackages%2Fha-card-porta-ingresso&category=Dashboard)

## 2. Installazione della Custom Card

1. Dopo aver aggiunto il repository, cerca **ha-card-porta-ingresso** nell'elenco delle integrazioni HACS.
2. Clicca su **Install** per avviare il processo di installazione.
3. Una volta completata l'installazione, vai su **Lovelace** e **Gestisci Risorse** per aggiungere la risorsa del file JS, come descritto nella sezione precedente.

## 3. Aggiungi la Card alla tua Dashboard

Una volta installata la card tramite HACS, puoi configurarla come spiegato nella sezione **Configurazione della Card** qui sopra.

## Link Utili

- Repository GitHub: [ha-card-porta-ingresso](https://github.com/OneStatePackages/ha-card-porta-ingresso)

## 3. Configurazione della Card


Per utilizzare la Custom Card Porta Ingresso nel tuo dashboard, puoi aggiungere la seguente configurazione nel tuo file YAML di Lovelace:


```yaml
type: custom:door-package-card
smartlock: lock.porta
building-door: switch.cancello
sensor: binary_sensor.sensore_porta_package     #CONFIGURAZIONE OBBLIGATORIA
```


# Parametri:
- `smartlock`: La tua entità  che rappresenta il blocco della porta (e.g., `lock.porta`).
- `building-door`: La tua entitÃ  che rappresenta il cancello o portone (e.g., `switch.cancello`).
- `sensor`: La tua entità  sensore della porta, che rileva se la porta è aperta o chiusa (e.g., `binary_sensor.sensore_porta_package`).


### Installazione Manuale

Per integrare la **Custom Card Porta Ingresso** in Home Assistant, segui questi passaggi:

## 1. Posizionamento del file JS

Metti il file `door-package-card.js` nella cartella `/local/community/` della tua configurazione di Home Assistant.

Il percorso completo sara` quindi:
```
/config/www/community/door-package-card.js
```

## 2. Aggiungere le risorse in Lovelace

Per caricare correttamente la Custom Card, aggiungi la seguente configurazione alle **Risorse** di Lovelace:

1. Vai su **Lovelace**.
2. Clicca sui tre puntini in alto a destra e seleziona **Gestisci Risorse**.
3. Aggiungi la seguente riga nel campo di configurazione delle risorse:

```yaml
resources:
  - url: /local/community/door-package-card.js
    type: module
```

# 3. Salvataggio e Ricarica
Una volta che hai aggiunto la configurazione, assicurati di salvare i cambiamenti e ricaricare la dashboard per vedere la nuova card in azione.
