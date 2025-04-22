# Configurazione della Custom Card Porta Ingresso

Per integrare la **Custom Card Porta Ingresso** in Home Assistant, segui questi passaggi:

### 1. Posizionamento del file JS

Metti il file `door-package-card.js` nella cartella `/local/community/` della tua configurazione di Home Assistant.

Il percorso completo sarà quindi:

/config/www/community/door-package-card.js



### 2. Aggiungere le risorse in Lovelace

Per caricare correttamente la Custom Card, aggiungi la seguente configurazione alle **Risorse** di Lovelace:

1. Vai su **Lovelace**.
2. Clicca sui tre puntini in alto a destra e seleziona **Gestisci Risorse**.
3. Aggiungi la seguente riga nel campo di configurazione delle risorse:

```
resources:
  - url: /local/community/door-package-card.js
    type: module
```
### 3. Configurazione della Card
Per utilizzare la Custom Card Porta Ingresso nel tuo dashboard, puoi aggiungere la seguente configurazione nel tuo file YAML di Lovelace:
```
type: custom:door-package-card
smartlock: lock.porta
building-door: switch.cancello
sensor: binary_sensor.sensore_porta_package     #OBBLIGATORIO
```

Parametri:
- smartlock: La tua entità che rappresenta il blocco della porta (e.g., lock.porta).

- building-door: La tua entità che rappresenta il cancello o portone (e.g., switch.cancello).

- sensor: La tua entità sensore della porta, che rileva se la porta è aperta o chiusa (e.g., binary_sensor.sensore_porta_package).

### 4. Salvataggio e Ricarica
Una volta che hai aggiunto la configurazione, assicurati di salvare i cambiamenti e ricaricare la dashboard per vedere la nuova card in azione.

## Buona configurazione! 😎
