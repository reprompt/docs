import { Tip, CodeBlock } from '@mintlify/components';

export const FindPlacesInteractive = () => {
  const { useState, useRef, useEffect, useCallback } = React

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)

  const mapboxToken = 'pk.eyJ1IjoibGthczUxIiwiYSI6ImNsejkwNXkydDAyMmIyaXBvMGF6d3g1bDMifQ.A7Ey8Qb14RTMNh27c3s_FQ'

  // State
  const [apiKey, setApiKey] = useState('')
  const [latitude, setLatitude] = useState(37.7749)
  const [longitude, setLongitude] = useState(-122.4194)
  const [radius, setRadius] = useState(1000)
  const [category, setCategory] = useState('cafe')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  // Update code examples when API key changes
  useEffect(() => {
    const updateCodeExamples = () => {
      const codeBlocks = document.querySelectorAll('code')
      codeBlocks.forEach(block => {
        const text = block.textContent
        if (text && text.includes('Authorization: Bearer')) {
          const displayKey = apiKey || '{YOUR_API_KEY}'
          const updated = text.replace(/Bearer\s+[^\s'"]*/g, `Bearer ${displayKey}`)
          if (updated !== text) {
            block.textContent = updated
          }
        }
      })
    }
    updateCodeExamples()
  }, [apiKey])

  // Helper to create circle GeoJSON
  const createCircleGeoJSON = useCallback((lat, lng, radiusMeters) => {
    const points = 64
    const distanceX = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180))
    const distanceY = radiusMeters / 110540

    const coordinates = []
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI
      const dx = distanceX * Math.cos(angle)
      const dy = distanceY * Math.sin(angle)
      coordinates.push([lng + dx, lat + dy])
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    const loadMapbox = async () => {
      // Load CSS
      if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css'
        document.head.appendChild(link)
      }

      // Load JS
      if (!window.mapboxgl) {
        const script = document.createElement('script')
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js'
        document.head.appendChild(script)
        await new Promise((resolve) => { script.onload = resolve })
      }

      const mapboxgl = window.mapboxgl
      if (!mapContainerRef.current || !mapboxgl || mapRef.current) return

      mapboxgl.accessToken = mapboxToken

      // Initialize map
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [longitude, latitude],
        zoom: 13
      })

      // Add controls
      map.addControl(new mapboxgl.NavigationControl())

      // Create popup
      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })

      // Add sources and layers when map loads
      map.on('load', () => {
        // Search center marker
        map.addSource('search-center', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [longitude, latitude] }
          }
        })

        map.addLayer({
          id: 'search-center',
          type: 'circle',
          source: 'search-center',
          paint: {
            'circle-radius': 10,
            'circle-color': '#3B82F6',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
          }
        })

        // Search radius circle
        map.addSource('search-radius', {
          type: 'geojson',
          data: createCircleGeoJSON(latitude, longitude, radius)
        })

        map.addLayer({
          id: 'search-radius-fill',
          type: 'fill',
          source: 'search-radius',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.1
          }
        })

        map.addLayer({
          id: 'search-radius-line',
          type: 'line',
          source: 'search-radius',
          paint: {
            'line-color': '#2563EB',
            'line-width': 2,
            'line-dasharray': [3, 3]
          }
        })

        // Place results
        map.addSource('place-results', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        })

        map.addLayer({
          id: 'place-results',
          type: 'circle',
          source: 'place-results',
          paint: {
            'circle-radius': 8,
            'circle-color': '#10B981',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        // Place labels
        map.addLayer({
          id: 'place-labels',
          type: 'symbol',
          source: 'place-results',
          layout: {
            'text-field': ['get', 'name'],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 1,
            'text-size': 11
          },
          paint: {
            'text-color': '#1F2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        })

        // Click handler - set search location
        map.on('click', (e) => {
          const { lng, lat } = e.lngLat
          setLatitude(lat)
          setLongitude(lng)

          // Update map immediately
          const centerSource = map.getSource('search-center')
          if (centerSource) {
            centerSource.setData({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] }
            })
          }

          const radiusSource = map.getSource('search-radius')
          if (radiusSource) {
            radiusSource.setData(createCircleGeoJSON(lat, lng, radius))
          }
        })

        // Hover on places
        map.on('mouseenter', 'place-results', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          if (e.features && e.features[0] && popupRef.current) {
            const feature = e.features[0]
            const coords = feature.geometry.coordinates
            const props = feature.properties

            popupRef.current
              .setLngLat(coords)
              .setHTML(`
                <div style="padding: 8px; max-width: 250px;">
                  <div style="font-weight: 600; margin-bottom: 4px;">${props.name || 'Unknown'}</div>
                  ${props.full_address ? `<div style="font-size: 12px; color: #666;">${props.full_address}</div>` : ''}
                  ${props.category_primary ? `<div style="font-size: 11px; margin-top: 4px; color: #888;">${props.category_primary}</div>` : ''}
                </div>
              `)
              .addTo(map)
          }
        })

        map.on('mouseleave', 'place-results', () => {
          map.getCanvas().style.cursor = ''
          if (popupRef.current) popupRef.current.remove()
        })
      })

      mapRef.current = map
    }

    loadMapbox()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update radius circle when params change
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return

    const radiusSource = mapRef.current.getSource('search-radius')
    if (radiusSource) {
      radiusSource.setData(createCircleGeoJSON(latitude, longitude, radius))
    }
  }, [latitude, longitude, radius, createCircleGeoJSON])

  // Handle search
  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build request body
      const requestBody = {
        location_filter: {
          latitude: latitude,
          longitude: longitude,
          radius: radius
        }
      }

      // Add categories if provided
      if (category.trim()) {
        const categories = category.split(',').map(c => c.trim()).filter(c => c)
        if (categories.length > 0) {
          requestBody.categories = categories
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }

      const response = await fetch('https://api.reprompt.io/v2/find-places', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your key and try again.')
        }
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      setResults(data)

      // Update map with results
      if (mapRef.current) {
        const placesSource = mapRef.current.getSource('place-results')
        if (placesSource) {
          const features = (data.results || []).map(place => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [place.longitude, place.latitude]
            },
            properties: {
              name: place.name,
              full_address: place.full_address,
              category_primary: place.category_primary
            }
          }))

          placesSource.setData({ type: 'FeatureCollection', features })

          // Fit bounds to show all results
          if (features.length > 0) {
            const bounds = new window.mapboxgl.LngLatBounds()
            features.forEach(f => bounds.extend(f.geometry.coordinates))
            bounds.extend([longitude, latitude])
            mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to search places')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', marginTop: '20px', marginBottom: '20px' }}>
      {/* API Key Input */}
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            API Key (required for requests - will inject into examples)
          </label>
          <input
            type="password"
            placeholder="Enter your Reprompt API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={latitude.toFixed(6)}
            onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={longitude.toFixed(6)}
            onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            Radius (m)
          </label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value) || 1000)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., restaurant, cafe"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={isLoading || !apiKey || !apiKey.trim()}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: (isLoading || !apiKey || !apiKey.trim()) ? '#9CA3AF' : '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: (isLoading || !apiKey || !apiKey.trim()) ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {isLoading ? 'Searching...' : 'Find Places'}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '6px',
          color: '#991B1B',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Map */}
      <div style={{ position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '500px'
          }}
        />

        {/* Legend inside map */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          lineHeight: '1.8',
          pointerEvents: 'none'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3B82F6', border: '2px solid white' }} />
            <span>Search Center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <div style={{ width: '12px', height: '2px', backgroundColor: '#3B82F6', opacity: '0.5' }} />
            <span>Search Radius</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', border: '2px solid white' }} />
            <span>Places Found</span>
          </div>
        </div>
      </div>

      {/* Results Tip */}
      {results && results.results && results.results.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Tip>
            Found {results.results.length} {results.results.length === 1 ? 'place' : 'places'} in this area
          </Tip>
        </div>
      )}

      {/* Response Example */}
      {results && results.results && results.results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <CodeBlock language="json">
            <code>
              {JSON.stringify({ results: results.results.slice(0, 3) }, null, 2)}
            </code>
          </CodeBlock>
        </div>
      )}
    </div>
  )
}
