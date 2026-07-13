# Scheda Palestra

Web app mobile-first per importare una scheda di allenamento in formato testo, salvarne la durata e tracciare i pesi usati nel tempo.

## Funzioni incluse

- Import da testo incollato o file `.txt`
- Import da immagini/foto/screenshot con OCR nel browser
- Parser per giorni di allenamento come `Allenamento 1`, `Workout 1`, `Giorno A`, `Day 1`
- Anteprima divisa per giorni, modificabile prima del salvataggio
- Giorni ed esercizi aggiungibili o eliminabili
- Selezione durata tramite date o numero di settimane
- Vista verticale con tab per workout
- Campi modificabili per nome esercizio, serie, ripetizioni, recupero e carico
- Campo peso per ogni esercizio con ultimo peso usato come riferimento
- Storico progressi per esercizio con mini grafico e lista date/pesi
- Salvataggio persistente nel browser tramite `localStorage`

## Avvio

Apri `index.html` nel browser. Non servono login, server o installazione di pacchetti.

## Formato testo consigliato

```text
Allenamento 1
Panca piana 4x8 rec 90 sec
Lat machine 3 x 12 recupero 60 sec

Giorno B
Squat 5x5 rest 120 sec
Leg curl 3x10
```

Il parser accetta varianti comuni, purché ogni esercizio contenga serie e ripetizioni in forma simile a `4x8`.
Se l'OCR da immagine non legge perfettamente la scheda, il testo estratto può essere corretto prima di creare i box dei giorni.
