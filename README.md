# Mi Seguimiento Cannábico — Versión pacientes / reportes médicos

Aplicación web mobile-first para que una persona adulta que utiliza cannabis medicinal pueda registrar patologías/condiciones en seguimiento, evolución diaria, sueño, bienestar, funcionalidad, uso u omisión del tratamiento, efectos no deseados, adherencia e historial desde su propio dispositivo.

Incluye una sección de **Reportes para mi médica** para generar un resumen semanal, mensual, completo o personalizado e imprimirlo/guardarlo como PDF.

## Cambios incluidos en esta versión

- Nuevo logo neutral con hoja de cannabis, escudo, cruz médica y check, aplicado como marca del encabezado e ícono PWA.
- En configuración y onboarding se reemplazó “síntomas seleccionados” por **patologías o condiciones en seguimiento**.
- Se agregó un catálogo ampliado de condiciones frecuentes para seguimiento: dolor crónico, dolor neuropático, lumbalgia/cervicalgia, artritis, fibromialgia, migrañas/cefaleas, insomnio, ansiedad, estrés, trastornos digestivos, epilepsia, autismo/TEA, Parkinson, esclerosis múltiple, cuidados paliativos, síntomas oncológicos, náuseas/vómitos, bruxismo, psoriasis/afecciones cutáneas y otra condición editable.
- Cuando aparece “Otro”, “Otra” u “Otros”, ahora hay un campo para escribir manualmente la aclaración correspondiente.
- En “Mi día”, primero se registra la intensidad de las patologías/condiciones a tratar.
- Debajo aparece el bloque **Completá los siguientes registros**, con preguntas generales de seguimiento y seguridad inspiradas en el formulario médico de seguimiento: evolución respecto al motivo inicial, mejoría percibida, sueño, bienestar, funcionalidad, desempeño, memoria/concentración, seguridad percibida, control sobre el uso, problemas familiares/laborales/académicos/sociales, utilidad percibida, continuidad, aspectos mejorados, efectos no deseados y comentarios.
- Los reportes médicos incluyen las nuevas respuestas del último seguimiento.

## Uso previsto

Esta versión puede usarse como **registro personal del paciente** y como apoyo para conversar con su médica/o tratante. No es una historia clínica electrónica, no tiene panel profesional, no centraliza datos y no envía información automáticamente a ninguna ONG, profesional, servidor ni nube.

## Avisos importantes

- Usar apodo, iniciales o nombre elegido. No cargar DNI, domicilio, fotos de estudios ni datos identificatorios directos.
- La app no brinda diagnósticos, no indica tratamientos, no recomienda dosis, no sugiere productos y no reemplaza el seguimiento médico.
- Ante síntomas intensos, efectos no deseados importantes o una urgencia, contactar al profesional tratante o al servicio de emergencias local.
- Los datos se guardan localmente en el navegador mediante `localStorage`. Esto permite una prueba/piloto en el dispositivo del paciente, pero una versión clínica con datos identificables deberá usar autenticación, backend seguro, consentimiento informado, auditoría, control de accesos y base de datos protegida.

## Cómo usar el ZIP

1. Descomprimir `seguimiento-cannabis-pacientes-reportes-v3-github.zip`.
2. Abrir la carpeta `seguimiento-cannabis-pacientes-reportes-v3/`.
3. Subir todos los archivos al repositorio de GitHub.
4. Verificar que `index.html` quede en la raíz del repositorio.

## Publicar con GitHub Pages

1. Entrar al repositorio en GitHub.
2. Ir a `Settings`.
3. Ir a `Pages`.
4. En `Build and deployment`, elegir `Deploy from a branch`.
5. Elegir branch `main` y carpeta `/(root)`.
6. Guardar.
7. Abrir el enlace publicado cuando GitHub lo genere.

La app usa rutas relativas, por eso puede funcionar dentro de una subcarpeta tipo:

`usuario.github.io/nombre-del-repositorio/`

## Agregar a pantalla de inicio

### iPhone / Safari

1. Abrir el enlace publicado desde Safari.
2. Tocar el botón de compartir.
3. Elegir `Agregar a pantalla de inicio`.
4. Confirmar el nombre `Seguimiento`.

### Android / Chrome

1. Abrir el enlace publicado desde Chrome.
2. Abrir el menú de tres puntos.
3. Elegir `Agregar a pantalla principal` o `Instalar app`.
4. Confirmar.

## Archivos principales

- `index.html`: estructura base.
- `styles.css`: diseño visual mobile-first.
- `app.js`: lógica de navegación, formularios, localStorage, cálculos, historial y datos de ejemplo.
- `manifest.webmanifest`: configuración PWA.
- `service-worker.js`: caché simple de archivos esenciales.
- `icons/`: íconos PNG para instalación y logo.

## Funciones incluidas

- Onboarding con perfil por apodo/iniciales.
- Selección de patologías/condiciones en seguimiento.
- Campos manuales para opciones “Otro/Otra/Otros”.
- Avisos de privacidad, alcance y no reemplazo médico.
- Inicio con check-in, tratamiento del día, resumen, reporte y racha.
- Check-in diario con intensidad de patologías/condiciones y registros generales.
- Tratamiento con producto, horarios, tomas y cambios.
- Evolución con promedios, adherencia y gráficos simples.
- Reportes para médica/o tratante con selector semanal, mensual, todo el seguimiento o período personalizado.
- Vista imprimible del reporte para usar “Guardar como PDF” desde navegador o celular.
- Descarga de reporte en TXT y JSON del período seleccionado.
- Historial filtrable y editable.
- Exportación de resumen rápido en TXT para compartir voluntariamente con el profesional.
- Exportación/importación JSON local.
- Configuración con datos de ejemplo y borrado de datos.
- PWA instalable con manifest, service worker e íconos.
