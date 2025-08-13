/* =======================
   Configuración (cambiar)
   ======================= */
const BACKEND_URL = 'http://localhost:3000'; // <- tu backend
const NUMERO_WHATSAPP = '59170000000';      // <- tu número con código de país (sin + ni espacios)

/* ========== Elementos ========== */
const montoInput = document.getElementById('monto');
const tipoCambioInfo = document.getElementById('tipo-cambio-info');
const resultadoDiv = document.getElementById('resultado');
const abrirModalBtn = document.getElementById('abrirModalBtn'); // abre modal para subir
const enviarWhatsAppBtn = document.getElementById('enviarWhatsAppBtn'); // abre wa.me
const linkWhatsApp = document.getElementById('linkWhatsApp');

const whatsappBubble = document.getElementById('whatsappBubble') || document.getElementById('whatsappBubble'); // fallback

/* Modal & form */
const modal = document.getElementById('modalComprobante');
const cerrarModal = document.getElementById('cerrarModal');
const formComprobante = document.getElementById('formComprobante');
const archivoInput = document.getElementById('archivoComprobante');
const qrInput = document.getElementById('archivoQR');
const progresoWrapper = document.getElementById('progresoWrapper');
const progresoBar = document.getElementById('progresoBar');
const mensajeEnvio = document.getElementById('mensajeEnvio');
const btnEnviarComprobante = document.getElementById('btnEnviarComprobante');
const btnCancelar = document.getElementById('btnCancelar');

/* Nuevos inputs */
const nombreEnvioInput = document.getElementById('nombreEnvio');
const nombreRecibeInput = document.getElementById('nombreRecibe');
const ciInput = document.getElementById('ci');
const bancoInput = document.getElementById('bancoDestino');
const tipoCuentaInput = document.getElementById('tipoCuenta');

let tasaPor10k = null; // numero

/* ========== Cargar tipo de cambio desde backend ========== */
async function cargarTipoDeCambio() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tipo-cambio`);
    if (!res.ok) throw new Error('No se pudo obtener tipo de cambio');
    const data = await res.json();
    tasaPor10k = Number(data.tipoDeCambioPor10k);
    tipoCambioInfo.textContent = `Tipo de cambio actual: 10.000 CLP = ${tasaPor10k.toLocaleString('es-CL')} BOB`;
    // actualizar resultado si hay monto
    if (montoInput.value) calcularYMostrar();
  } catch (err) {
    tipoCambioInfo.textContent = 'No se pudo cargar el tipo de cambio.';
    console.error(err);
  }
}

/* ========== Conversión automática ========== */
function calcularYMostrar() {
  const monto = parseFloat(montoInput.value);
  if (!tasaPor10k || isNaN(monto) || monto < 10000) {
    resultadoDiv.textContent = monto ? 'Ingrese monto mínimo 10.000 CLP.' : '';
    abrirModalBtn.disabled = true;
    enviarWhatsAppBtn.disabled = true;
    return;
  }else if (monto >= 1000000) {
    let x = 170;
  const resultado = (monto * x) / 10000;
  resultadoDiv.innerHTML = `${monto.toLocaleString('es-CL')} CLP = <strong>${resultado.toLocaleString('es-CL', {minimumFractionDigits:2, maximumFractionDigits:2})} BOB</strong><br>
    <small>Tipo usado: 10.000 CLP = ${x.toLocaleString('es-CL')} BOB</small>`;
  abrirModalBtn.disabled = false;
  enviarWhatsAppBtn.disabled = false;
  } else {
  const resultado = (monto * tasaPor10k) / 10000;
  resultadoDiv.innerHTML = `${monto.toLocaleString('es-CL')} CLP = <strong>${resultado.toLocaleString('es-CL', {minimumFractionDigits:2, maximumFractionDigits:2})} BOB</strong><br>
    <small>Tipo usado: 10.000 CLP = ${tasaPor10k.toLocaleString('es-CL')} BOB</small>`;
  abrirModalBtn.disabled = false;
  enviarWhatsAppBtn.disabled = false;
}}

/* Eventos de input */
window.addEventListener('load', () => {
  cargarTipoDeCambio();
  setInterval(cargarTipoDeCambio, 300000); // refrescar cada 5 minutos
});
montoInput.addEventListener('input', calcularYMostrar);

/* ========== WhatsApp: enviar texto con la cotización actual ========== */
enviarWhatsAppBtn.addEventListener('click', () => {
  const monto = parseFloat(montoInput.value);
  if (isNaN(monto) || monto < 10000 || !tasaPor10k) {
    alert('Ingrese un monto válido (mínimo 10.000 CLP) y espere que cargue el tipo de cambio.');
    return;
  }
  const montoBOB = ((monto * tasaPor10k) / 10000).toFixed(2);
  const mensaje = `Hola, deseo enviar ${monto.toLocaleString('es-CL')} CLP (≈ ${montoBOB} BOB). Adjunto comprobante.`;
  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
});
// link de contacto en sección contacto
if (linkWhatsApp) linkWhatsApp.href = `https://wa.me/${NUMERO_WHATSAPP}`;

// Bubble: enlaza al mismo número
const bubble = document.querySelector('.whatsapp-float');
if (bubble) bubble.href = `https://wa.me/${NUMERO_WHATSAPP}`;

/* ========== MODAL: abrir / cerrar ========== */
if (abrirModalBtn) abrirModalBtn.addEventListener('click', openModal);
if (cerrarModal) cerrarModal.addEventListener('click', closeModal);
if (btnCancelar) btnCancelar.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function openModal() {
  mensajeEnvio.textContent = '';
  progresoBar.style.width = '0%';
  progresoWrapper.style.display = 'none';

  // Reseteamos formulario y ponemos el monto actual calculado para editar si quiere
  if (formComprobante) formComprobante.reset();
  if (montoInput.value) {
    const monto = parseFloat(montoInput.value);
    if (!isNaN(monto)) {
      document.getElementById('montoModal').value = monto.toFixed(2);
    }
  }
  
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  if (nombreEnvioInput) nombreEnvioInput.focus();
}
function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
}

/* ========== SUBIR ARCHIVO AL BACKEND (fetch multipart/form-data) ========== */
if (formComprobante) {
  formComprobante.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar campos obligatorios
    const nombreEnvio = nombreEnvioInput.value.trim();
    const nombreRecibe = nombreRecibeInput.value.trim();
    const montoModal = parseFloat(document.getElementById('montoModal').value);
    const ci = ciInput.value.trim();
    const banco = bancoInput.value.trim();
    const tipoCuenta = tipoCuentaInput.value;
    const comprobanteFile = archivoInput.files[0];
    const qrFile = qrInput.files[0];

    if (!nombreEnvio || !nombreRecibe || isNaN(montoModal) || montoModal < 10000 || !ci || !banco || !tipoCuenta) {
      mensajeEnvio.style.color = 'crimson';
      mensajeEnvio.textContent = 'Por favor, completa todos los campos obligatorios con datos válidos (monto mínimo 10.000).';
      return;
    }
    if (!comprobanteFile) {
      mensajeEnvio.style.color = 'crimson';
      mensajeEnvio.textContent = 'Selecciona un archivo de comprobante antes de enviar.';
      return;
    }

    // Validar tipos y tamaños
    const allowedComprobanteTypes = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowedComprobanteTypes.includes(comprobanteFile.type)) {
      mensajeEnvio.style.color = 'crimson';
      mensajeEnvio.textContent = 'Tipo de archivo comprobante no permitido. Usa JPG/PNG/PDF.';
      return;
    }
    if (comprobanteFile.size > 10 * 1024 * 1024) {
      mensajeEnvio.style.color = 'crimson';
      mensajeEnvio.textContent = 'Archivo comprobante demasiado grande. Máximo 10 MB.';
      return;
    }

    // Validar QR solo si se subió
    if (qrFile) {
      const allowedQRTypes = ['image/jpeg','image/png','image/webp'];
      if (!allowedQRTypes.includes(qrFile.type)) {
        mensajeEnvio.style.color = 'crimson';
        mensajeEnvio.textContent = 'Tipo de archivo QR no permitido. Usa JPG/PNG.';
        return;
      }
      if (qrFile.size > 5 * 1024 * 1024) {
        mensajeEnvio.style.color = 'crimson';
        mensajeEnvio.textContent = 'Archivo QR demasiado grande. Máximo 5 MB.';
        return;
      }
    }

    // Preparar FormData
    const fd = new FormData();
    fd.append('nombreEnvio', nombreEnvio);
    fd.append('nombreRecibe', nombreRecibe);
    fd.append('monto', montoModal);
    fd.append('ci', ci);
    fd.append('banco', banco);
    fd.append('tipoCuenta', tipoCuenta);
    fd.append('comprobante', comprobanteFile);
    if (qrFile) fd.append('qr', qrFile);

    // mostrar progreso
    progresoWrapper.style.display = 'block';
    progresoBar.style.width = '2%';
    mensajeEnvio.style.color = '#004a86';
    mensajeEnvio.textContent = 'Enviando comprobante...';

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND_URL}/api/enviar-comprobante`, true);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Error al subir: ' + xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error('Error de red al subir archivo'));
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            progresoBar.style.width = pct + '%';
          }
        };
        xhr.send(fd);
      });

      mensajeEnvio.style.color = 'green';
      mensajeEnvio.textContent = 'Comprobante enviado correctamente. Gracias.';
      setTimeout(() => closeModal(), 2000);

    } catch (err) {
      console.error(err);
      mensajeEnvio.style.color = 'crimson';
      mensajeEnvio.textContent = 'Error al enviar comprobante. Intenta de nuevo.';
      progresoBar.style.width = '0%';
    }
  });
}
// funcion que hace que el forms de envio el monto sea estatico
function sacar_monto(){
    let monto_ingresado_total = document.getElementById('monto');
let dato_ingresado = document.getElementById('disabledTextInput');

if (monto_ingresado_total && dato_ingresado) {
    dato_ingresado.value = monto_ingresado_total.value;
}

}

