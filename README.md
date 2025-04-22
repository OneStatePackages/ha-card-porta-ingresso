La Card di Package Porta Ingresso

Metti il file all'interno della cartella 
```
/local/community/
```
Aggiungi le risorse alla plancia (tre puntini in alto a destra e "Gestisci Risorse"
```
resources: /local/community/ha-card-porta-ingresso.js
type: module javascript
```

e la configfurazione della card

```
type: custom:door-package-card
smartlock: lock.porta
building-door: switch.cancello
sensor: binary_sensor.sensore_porta_package

```
