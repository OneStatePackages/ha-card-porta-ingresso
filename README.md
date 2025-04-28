# Installazione tramite HACS

Se vuoi installare automaticamente **Door Package Card** tramite HACS, segui questi semplici passaggi:

## 1. Aggiungere il repository a HACS

1. Vai su **HACS** nel tuo Home Assistant.
2. Clicca su **Integrazioni** nel menu di sinistra.
3. Clicca sul pulsante con i tre puntini in alto a destra e seleziona **Aggiungi Repository**.
4. Inserisci il seguente URL del repository:
   ```
   https://github.com/OneStatePackages/ha-card-porta-ingresso
   ```
5. cerca "Door Package Card" nella lista e scaricala.

## 2. Configurazione della Card


Per utilizzare "Door Package Card" nella tuo dashboard, puoi aggiungere una scheda in modalita manuale nella tua Dashboard ed incollare questo codice:


```
type: custom:door-package-card
smartlock: lock.porta
gate: switch.portone
building-door: script.cancello
sensor: binary_sensor.sensore_porta_package     #CONFIGURAZIONE OBBLIGATORIA
```


## Parametri:

- `smartlock`: La tua entità  che rappresenta il blocco della porta (tipi di entità configurabili: `lock`).
- `building-door` & `gate`: La tua entità che rappresenta il cancello o portone (tipi di entità configurabili: `switch`,`script`,`lock`).
- `sensor`: La tua entità  sensore della porta, che rileva se la porta è aperta o chiusa (e.g., `binary_sensor.sensore_porta_package`). Questo sensore è obbligatorio e fa parte del package, quindi scrivere quello di default.




# Installazione Manuale

Per integrare la **Door Package Card** in Home Assistant, segui questi passaggi:

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

```
resources:
  - url: /local/community/door-package-card.js
    type: module
```

## 3. Salvataggio e Ricarica
Una volta che hai aggiunto la configurazione, assicurati di salvare i cambiamenti e ricaricare la dashboard per vedere la nuova card in azione.
