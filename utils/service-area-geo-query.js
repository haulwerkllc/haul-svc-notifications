/**
 * Service area OpenSearch helpers for notification resolvers (service_areas index, point-in-area).
 */

const SHAPE_TYPES = new Set(['Polygon', 'MultiPolygon']);

function normalizeServiceAreaType(type) {
  if (type == null || type === '') return 'radius';
  const s = String(type).toLowerCase();
  if (s === 'polygon') return 'polygon';
  if (s === 'municipality') return 'municipality';
  return 'radius';
}

function isValidGeoShapeGeometry(geometry) {
  if (!geometry || typeof geometry !== 'object') return false;
  if (!SHAPE_TYPES.has(geometry.type)) return false;
  if (!Array.isArray(geometry.coordinates)) return false;
  return true;
}

/**
 * Coarse OpenSearch query: active areas that might contain (lat, lon).
 * Radius / missing type: center within 100km (refined with Haversine in app).
 * Polygon / municipality: geo_shape point ∩ indexed geometry.
 */
function buildResolverCoarseServiceAreasQuery(lat, lon) {
  return {
    bool: {
      must: [{ term: { active: true } }],
      should: [
        {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    { bool: { must_not: { exists: { field: 'type' } } } },
                    { terms: { type: ['radius', 'RADIUS'] } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                geo_distance: {
                  distance: '100km',
                  center: { lat, lon },
                },
              },
            ],
          },
        },
        {
          bool: {
            must: [
              { terms: { type: ['polygon', 'POLYGON', 'municipality', 'MUNICIPALITY'] } },
              {
                geo_shape: {
                  geometry: {
                    shape: {
                      type: 'Point',
                      coordinates: [lon, lat],
                    },
                    relation: 'intersects',
                  },
                },
              },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}

module.exports = {
  buildResolverCoarseServiceAreasQuery,
  normalizeServiceAreaType,
  isValidGeoShapeGeometry,
};
