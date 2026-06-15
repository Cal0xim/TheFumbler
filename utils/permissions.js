// utils/permissions.js
console.log("[PERMISSIONS] file loaded");
const fs = require('fs');
const path = require('path');

const PERM_PATH = path.join(__dirname, '..', 'data', 'permissions.json');

function loadPermissions() {
    try {
        return JSON.parse(fs.readFileSync(PERM_PATH, 'utf8'));
    } catch {
        return {};
    }
}

async function canUseCommand(interaction, commandName) {
    const perms = loadPermissions();
    const config = perms[commandName];

    console.log("[PERMISSIONS] checking:", commandName, config);

    if (!config || !config.roles) return true;
    if (config.roles.length === 0) return true;

    const member = await interaction.guild.members.fetch(interaction.user.id);

    const hasRole = member.roles.cache.some(role =>
        config.roles.includes(role.id)
    );

    console.log("[PERMISSIONS] hasRole:", hasRole);

    return hasRole;
}

module.exports = { canUseCommand };