/** Read per request. Only the exact value `true` turns maintenance mode on. */
export function isMaintenanceMode(): boolean {
    return process.env.MAINTENANCE_MODE === "true";
}
