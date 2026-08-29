// Точка входа: /teacher — панель учителя, всё остальное — экран ученика.

import { startStudent, mountChrome as studentChrome } from './student.js';
import { startTeacher, mountChrome as teacherChrome } from './teacher.js';

const isTeacher = location.pathname.replace(/\/+$/, '') === '/teacher';
document.body.dataset.role = isTeacher ? 'teacher' : 'student';

if (isTeacher) {
  teacherChrome();
  startTeacher();
} else {
  studentChrome();
  startStudent();
}

window.addEventListener('error', (e) => console.error('[lingograd]', e.message));
