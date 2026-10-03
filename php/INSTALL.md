# Guia Completo de Instalação e Deploy em VPS Linux (512 MB RAM)

Este guia cobre a instalação do **Arboris** em uma VPS Linux extremamente econômica (1 vCPU, 512 MB de RAM, SSD), utilizando Debian 12 ou Ubuntu 22.04/24.04 LTS.

---

## 1. Preparação do Servidor e Swap

Em servidores com 512 MB de RAM física, a configuração de um swapfile de 1 GB em SSD é uma boa prática preventiva para absorver picos transitórios de E/S sem matar processos vitais:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

---

## 2. Instalação dos Pacotes Essenciais (Nginx, PHP 8.2 e SQLite)

```bash
sudo apt update
sudo apt install -y nginx php8.2-fpm php8.2-cli php8.2-sqlite3 php8.2-mbstring php8.2-xml php8.2-opcache sqlite3
```

---

## 3. Implantação dos Arquivos da Aplicação

```bash
# 1. Criar diretório do projeto
sudo mkdir -p /var/www/arboris
sudo chown -R www-data:www-data /var/www/arboris

# 2. Copiar os arquivos do projeto para /var/www/arboris
# (via git clone ou rsync)

# 3. Permissões de escrita apenas para o diretório de banco de dados e logs
sudo chmod -R 755 /var/www/arboris
sudo chmod -R 775 /var/www/arboris/database
sudo chown -R www-data:www-data /var/www/arboris/database
```

---

## 4. Configuração do PHP-FPM (Pool Otimizado para 512 MB)

Copie o arquivo de pool:

```bash
sudo cp /var/www/arboris/deploy/php-fpm-pool.conf /etc/php/8.2/fpm/pool.d/arboris.conf
# Desative o pool default 'www.conf' para não gastar memória duplicada:
sudo mv /etc/php/8.2/fpm/pool.d/www.conf /etc/php/8.2/fpm/pool.d/www.conf.disabled
sudo systemctl restart php8.2-fpm
```

---

## 5. Configuração do Nginx

```bash
sudo cp /var/www/arboris/deploy/nginx.conf /etc/nginx/sites-available/arboris
sudo ln -s /etc/nginx/sites-available/arboris /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Inicialização do Banco de Dados e Carga Inicial (Seeds)

```bash
cd /var/www/arboris
php -r "require 'src/Core/Database.php'; App\Core\Database::runMigrations();"
php database/seeds.php
```

Credenciais iniciais geradas:
- **Administrador**: `admin` / `Admin@Arboris2026`
- **Tronco Raiz Inicial**: `tronco_maria` / `Tronco@2026`

---

## 7. Configuração de Backup Automático do SQLite (Cron)

O script `deploy/backup-sqlite.sh` executa backup online respeitando as travas WAL sem travar leituras nem corromper arquivos.

Adicione ao crontab do root (`sudo crontab -e`):

```cron
# Backup seguro diário às 03:00 da manhã
0 3 * * * /var/www/arboris/deploy/backup-sqlite.sh /var/www/arboris/database/arboris.sqlite /var/backups/arboris >> /var/log/arboris_backup.log 2>&1
```

---

## 8. Guia de Migração Futura para PostgreSQL ou MySQL

A camada de persistência em `App\Core\Database.php` utiliza **PDO** estrito. Para migrar para PostgreSQL quando a volumetria justificar:

1. Instale o driver:
   ```bash
   sudo apt install -y php8.2-pgsql postgresql
   ```
2. Crie o banco e usuário no PostgreSQL:
   ```sql
   CREATE DATABASE arboris;
   CREATE USER arboris_user WITH ENCRYPTED PASSWORD 'sua_senha';
   GRANT ALL PRIVILEGES ON DATABASE arboris TO arboris_user;
   ```
3. Altere o `.env`:
   ```ini
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=arboris
   DB_USERNAME=arboris_user
   DB_PASSWORD=sua_senha
   ```
4. O `Database.php` detecta automaticamente a conexão e ajusta os drivers e prepared statements.
