# 📦 Sistema de Backup Automático - Yalorde Tentaciones

## 🚀 Cómo hacer un backup (SÚPER FÁCIL)

### Opción 1: Doble Click (Recomendado)

1. **Doble click en `HACER_BACKUP.bat`**
2. Espera 10-15 segundos
3. ¡Listo! Se creará una carpeta en `backups/YYYY-MM-DD/`

---

### Opción 2: Desde la terminal

```bash
node backup-database.js
```

---

## 📁 ¿Dónde se guardan los backups?

```
Yaroldetentaciones/
├── backups/
│   ├── 2026-02-07/
│   │   ├── products.json      (Inventario)
│   │   ├── orders.json        (Pedidos)
│   │   ├── sitecontents.json  (Configuración)
│   │   ├── users.json         (Clientes)
│   │   ├── coupons.json       (Cupones)
│   │   └── INFO.txt           (Información del backup)
│   ├── 2026-02-14/
│   └── 2026-02-21/
```

---

## 🔄 Cómo restaurar un backup

### Si borraste algo por error:

1. Abre una terminal en la carpeta del proyecto
2. Ejecuta:
   ```bash
   node restore-database.js 2026-02-07
   ```
   (Cambia la fecha por la del backup que quieres restaurar)

3. Escribe **SI** para confirmar
4. ¡Listo! Todo vuelve a como estaba

---

## ⚠️ IMPORTANTE

### Haz backup CADA SEMANA

**Recomendación:** Todos los domingos a las 8 PM
- Doble click en `HACER_BACKUP.bat`
- Espera 15 segundos
- Sube la carpeta `backups/` a Google Drive

### Guarda los backups en 2 lugares:

1. ✅ En tu PC (carpeta `backups/`)
2. ✅ En Google Drive o Dropbox

---

## 🆘 Preguntas Frecuentes

### ¿Cuánto espacio ocupan los backups?

- Cada backup: ~5-10 MB
- 10 backups: ~50-100 MB
- **Puedes tener 50+ backups sin problema**

### ¿Puedo borrar backups viejos?

Sí, pero **guarda siempre los últimos 4** (1 mes de historial).

### ¿Qué pasa si restauro un backup viejo?

Se **borrarán** todos los datos actuales y volverán a como estaban en esa fecha.

**Ejemplo:**
- Hoy es 15 de febrero
- Restauras backup del 7 de febrero
- Perderás todos los pedidos del 8 al 15 de febrero

**Solución:** Haz un backup ANTES de restaurar otro.

---

## 🎯 Rutina Recomendada

### Cada Domingo (5 minutos):

1. Doble click en `HACER_BACKUP.bat`
2. Abre la carpeta `backups/`
3. Súbela completa a Google Drive
4. Borra backups de hace más de 2 meses (opcional)

### Antes de hacer cambios grandes:

Si vas a:
- Borrar muchos productos
- Cambiar precios masivamente
- Hacer pruebas en el admin

**HAZ UN BACKUP PRIMERO** (por si acaso).

---

## 🔐 Seguridad

Los archivos JSON contienen:
- ✅ Inventario completo
- ✅ Pedidos y clientes
- ✅ Configuración del sitio

**NO los compartas con nadie** (tienen datos sensibles).

---

## 💡 Tips Pro

### Automatizar con Programador de Tareas (Windows)

1. Abre "Programador de tareas"
2. Crear tarea básica
3. Nombre: "Backup Yalorde"
4. Frecuencia: Semanal (Domingos, 8 PM)
5. Acción: Ejecutar `HACER_BACKUP.bat`

**Resultado:** Backups automáticos sin que hagas nada. 🎉

---

## 🆘 ¿Necesitas ayuda?

Si algo sale mal, revisa:
1. ¿Tienes internet? (necesario para conectar a MongoDB)
2. ¿El servidor está corriendo? (no es necesario, pero ayuda)
3. ¿Copiaste bien la fecha al restaurar?

**En caso de emergencia:** Contacta al desarrollador.
