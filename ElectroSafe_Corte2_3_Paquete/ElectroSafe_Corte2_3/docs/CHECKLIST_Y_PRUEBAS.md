# Checklist y pruebas — Force FX-C

## Inspección
Registrar resultado OK / NO OK / N/A y observación.

## Autochequeo
El manual indica que el encendido inicia un autochequeo y que deben verificarse indicadores, displays y tonos. Si el autochequeo falla, se registra el número de alarma y se consulta la sección de alarmas.

## REM
El procedimiento periódico del manual usa una caja de resistencia y verifica:
- 120 ohm → indicador REM verde.
- 135 ± 5 ohm → alarma REM.
- 60 ohm → indicador REM verde.
- 100 ohm → alarma REM.
- 30 ohm → indicador REM verde.
- 10 ohm → indicador REM verde.
- 3 ohm → alarma REM.
- conector sin pin: alarma al aumentar de 3 a 24 ohm.

## Salida
No confundir "potencia máxima del modo" con "criterio de aceptación de la prueba".

Para la comprobación periódica:
- Corte monopolar: carga 300 ohm, ajuste 75 W, comprobar corriente RMS 499 ± 38 mA.
- Coagulación monopolar: carga 500 ohm, ajuste 30 W, comprobar corriente RMS 245 ± 19 mA.
- Bipolar: carga 100 ohm; la documentación de servicio establece la verificación de corriente RMS según el procedimiento.

## Seguridad eléctrica
Registrar las mediciones reales de:
- fuga de baja frecuencia;
- fuga de alta frecuencia;
- resistencia de tierra.

Los valores deben introducirse desde el instrumento utilizado. El sistema no debe autogenerarlos.
