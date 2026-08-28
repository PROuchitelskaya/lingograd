# Развёртывание

Игра работает на VPS: FastAPI за nginx, systemd держит процесс.

- домен: https://lingograd.prouchitelskaya.ru
- код: `/opt/lingograd`
- сервис: `/etc/systemd/system/lingograd.service`
- nginx: `nginx-lingograd.conf` → `/etc/nginx/sites-available/lingograd`
- сертификат: Let's Encrypt, продлевается таймером certbot

Приложение слушает только 127.0.0.1 — наружу его пускает nginx.
Публичный адрес задаётся переменной `LINGOGRAD_PUBLIC_URL`: без неё
в QR-код попал бы внутренний IP сервера, недоступный ученикам.

Обновление:
```
scp -r backend frontend root@<сервер>:/opt/lingograd/
ssh root@<сервер> systemctl restart lingograd
```

Логи доступа в nginx выключены намеренно: игра не должна хранить
IP-адреса детских телефонов (152-ФЗ). На диск не пишется ничего —
состояние комнат живёт в памяти процесса и стирается через 6 часов.
