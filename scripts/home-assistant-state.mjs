export function isEntityAvailable(entity, entityId) {
  return entity?.entity_id === entityId &&
    typeof entity.state === 'string' &&
    !['unavailable', 'unknown'].includes(entity.state) &&
    entity.attributes?.restored !== true;
}
