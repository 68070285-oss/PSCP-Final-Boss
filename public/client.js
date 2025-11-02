// ต้องมีชื่อก่อนเข้า ไม่งั้นส่งกลับหน้า welcome
const existingName = localStorage.getItem('name');
if (!existingName || !existingName.trim()) {
  window.location.replace('/welcome.html');
}

const socket = io();

const $messages = document.getElementById('messages');
const $typing   = document.getElementById('typing');
const $form     = document.getElementById('form');
const $input    = document.getElementById('input');

const myName = existingName.trim();

// ตั้ง username ทันทีหลังเชื่อมต่อ
socket.on('connect', () => {
  socket.emit('set-username', myName);
});

function fmtTime(ts){ return new Date(ts).toLocaleString(); }
function avatar(name){ return (name?.trim()?.[0] || '?').toUpperCase(); }

function addMessage({ user, text, ts, system }){
  const el = document.createElement('div');
  if (system) {
    el.className = 'system';
    el.textContent = text;
  } else {
    el.className = 'msg';
    el.innerHTML = `
      <div class="avatar">${avatar(user)}</div>
      <div>
        <div class="meta">${user} • ${fmtTime(ts)}</div>
        <div class="text">${text}</div>
      </div>
    `;
  }
  $messages.appendChild(el);
  $messages.scrollTop = $messages.scrollHeight;
}

socket.on('history', items => items.forEach(addMessage));
socket.on('system',  p => addMessage({ system:true, text:p.text }));
socket.on('chat',    msg => addMessage(msg));

let typingTimer;
$input.addEventListener('input', () => {
  socket.emit('typing', true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('typing', false), 800);
});

socket.on('typing', ({ user, isTyping }) => {
  $typing.textContent = isTyping ? `${user} is typing…` : '';
});

$form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $input.value.trim();
  if (!text) return;
  socket.emit('chat', text);
  $input.value = '';
});
