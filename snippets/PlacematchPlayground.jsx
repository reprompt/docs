import { Tip, CodeBlock } from '@mintlify/components';

export const PlacematchPlayground = () => {
  const { useState, useEffect, useRef, useCallback } = React

  // State
  const [apiKey, setApiKey] = useState('')
  const [placeName, setPlaceName] = useState('Starbucks')
  const [placeAddress, setPlaceAddress] = useState('')
  const [latitude, setLatitude] = useState(40.7614327)
  const [longitude, setLongitude] = useState(-73.9776216)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const mapboxToken = 'pk.eyJ1IjoibGthczUxIiwiYSI6ImNsejkwNXkydDAyMmIyaXBvMGF6d3g1bDMifQ.A7Ey8Qb14RTMNh27c3s_FQ'

  // Example scenarios from API docs
  const examples = [
    {
      name: 'Starbucks Times Square',
      placeName: 'Starbucks',
      address: '',
      lat: 40.7614327,
      lng: -73.9776216
    }
  ]

  // Load example
  const loadExample = useCallback((example) => {
    setPlaceName(example.placeName)
    setPlaceAddress(example.address)
    setLatitude(example.lat)
    setLongitude(example.lng)
    setResults(null)
    setError(null)
  }, [])

  // API key injection into code examples
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

  // Get line thickness based on confidence
  const getLineThickness = (confidence) => {
    if (typeof confidence === 'string') {
      if (confidence === 'VERY_HIGH') return 10
      if (confidence === 'HIGH') return 7
      if (confidence === 'MEDIUM') return 4
      if (confidence === 'LOW') return 2
    }
    // Fallback for numeric confidence scores
    if (confidence >= 0.90) return 10
    if (confidence >= 0.80) return 7
    if (confidence >= 0.60) return 4
    return 2
  }

  // Get line color based on confidence
  const getLineColor = (confidence) => {
    if (typeof confidence === 'string') {
      if (confidence === 'VERY_HIGH') return '#3B82F6'  // Blue
      if (confidence === 'HIGH') return '#3B82F6'  // Blue
      if (confidence === 'MEDIUM') return '#F59E0B'  // Orange
      if (confidence === 'LOW') return '#9CA3AF'  // Gray
    }
    // Fallback for numeric confidence scores
    if (confidence >= 0.80) return '#3B82F6'  // Blue for HIGH and VERY_HIGH
    if (confidence >= 0.60) return '#F59E0B'  // Orange for MEDIUM
    return '#9CA3AF'  // Gray for LOW
  }

  // Initialize map
  useEffect(() => {
    // Load Mapbox CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css'
      document.head.appendChild(link)
    }

    // Load Mapbox JS
    if (!window.mapboxgl) {
      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js'
      script.onload = initializeMap
      document.head.appendChild(script)
    } else {
      initializeMap()
    }

    function initializeMap() {
      const mapboxgl = window.mapboxgl
      if (!mapContainerRef.current || !mapboxgl || mapRef.current) return

      mapboxgl.accessToken = mapboxToken

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [longitude, latitude],
        zoom: 13
      })

      map.addControl(new mapboxgl.NavigationControl())

      // Create popup
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      })

      map.on('load', () => {
        // Add source for connection lines (add first so it renders below)
        map.addSource('match-lines', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        // Add layer for lines (add first so it renders below)
        map.addLayer({
          id: 'connection-lines',
          type: 'line',
          source: 'match-lines',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'thickness'],
            'line-opacity': 0.7
          }
        })

        // Add source for input point
        map.addSource('input-point', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        // Add layer for input point marker
        map.addLayer({
          id: 'input-marker',
          type: 'circle',
          source: 'input-point',
          paint: {
            'circle-radius': 10,
            'circle-color': '#EF4444',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff'
          }
        })

        // Add source for results
        map.addSource('match-results', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })

        // Add layer for result markers
        map.addLayer({
          id: 'result-markers',
          type: 'circle',
          source: 'match-results',
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        })

        // Hover on results
        map.on('mouseenter', 'result-markers', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          if (e.features && e.features[0] && popupRef.current) {
            const feature = e.features[0]
            const coords = feature.geometry.coordinates
            const props = feature.properties

            popupRef.current
              .setLngLat(coords)
              .setHTML(`
                <div style="padding: 8px; max-width: 300px;">
                  <div style="font-weight: 600; margin-bottom: 4px;">${props.name || 'Unknown'}</div>
                  ${props.full_address ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${props.full_address}</div>` : ''}
                  ${props.source ? `<div style="font-size: 11px; color: #888;">Source: ${props.source}</div>` : ''}
                  ${props.confidence ? `<div style="font-size: 11px; color: #888;">Confidence: ${props.confidence}</div>` : ''}
                  ${props.reasoning ? `<div style="font-size: 11px; color: #666; margin-top: 4px; font-style: italic;">${props.reasoning}</div>` : ''}
                </div>
              `)
              .addTo(map)
          }
        })

        map.on('mouseleave', 'result-markers', () => {
          map.getCanvas().style.cursor = ''
          if (popupRef.current) popupRef.current.remove()
        })
      })

      mapRef.current = map
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update map when lat/lng changes
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13 })
    }
  }, [latitude, longitude])

  // Handle placematch request
  const handleMatch = useCallback(async () => {
    if (!apiKey || !apiKey.trim()) return

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const requestBody = {
        place: {},
        match_sources: ['reprompt'],
        max_matches: 5
      }

      if (placeName && placeName.trim()) {
        requestBody.place.name = placeName.trim()
      }
      if (placeAddress && placeAddress.trim()) {
        requestBody.place.full_address = placeAddress.trim()
      }
      if (latitude && longitude) {
        requestBody.place.latitude = parseFloat(latitude)
        requestBody.place.longitude = parseFloat(longitude)
      }

      const response = await fetch('https://api.reprompt.io/v2/placematch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key')
        }
        const errorData = await response.json()
        throw new Error(errorData.message || `Error: ${response.status}`)
      }

      const data = await response.json()
      setResults(data)

      // Update map visualization
      if (mapRef.current && mapRef.current.isStyleLoaded() && data.results && data.results.length > 0) {
        // Create GeoJSON for input point
        const inputFeature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          properties: {
            name: placeName || 'Input Location'
          }
        }

        // Create GeoJSON for results
        const resultFeatures = data.results
          .filter(r => r.latitude && r.longitude)
          .map(result => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [result.longitude, result.latitude]
            },
            properties: {
              name: result.name,
              full_address: result.full_address,
              source: result.source,
              confidence: result.confidence,
              reasoning: result.reasoning,
              color: getLineColor(result.confidence)
            }
          }))

        // Create GeoJSON for lines
        const lineFeatures = data.results
          .filter(r => r.latitude && r.longitude)
          .map(result => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [parseFloat(longitude), parseFloat(latitude)],
                [result.longitude, result.latitude]
              ]
            },
            properties: {
              thickness: getLineThickness(result.confidence),
              color: getLineColor(result.confidence)
            }
          }))

        // Update input point source
        const inputSource = mapRef.current.getSource('input-point')
        if (inputSource) {
          inputSource.setData({
            type: 'FeatureCollection',
            features: [inputFeature]
          })
        }

        // Update result sources
        const resultSource = mapRef.current.getSource('match-results')
        if (resultSource) {
          resultSource.setData({
            type: 'FeatureCollection',
            features: resultFeatures
          })
        }

        const lineSource = mapRef.current.getSource('match-lines')
        if (lineSource) {
          lineSource.setData({
            type: 'FeatureCollection',
            features: lineFeatures
          })
        }

        // Fit bounds to show all results
        const bounds = new window.mapboxgl.LngLatBounds()
        bounds.extend([longitude, latitude])
        data.results.forEach(result => {
          if (result.latitude && result.longitude) {
            bounds.extend([result.longitude, result.latitude])
          }
        })
        mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, placeName, placeAddress, latitude, longitude])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Example Scenarios */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {examples.map((example, idx) => (
          <button
            key={idx}
            onClick={() => loadExample(example)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {example.name}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* API Key */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            API Key (required)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Place Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Place Name
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g., Starbucks"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Address
            </label>
            <input
              type="text"
              value={placeAddress}
              onChange={(e) => setPlaceAddress(e.target.value)}
              placeholder="e.g., 1585 Broadway, New York, NY"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Coordinates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Latitude
            </label>
            <input
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              step="0.000001"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Longitude
            </label>
            <input
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              step="0.000001"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Match Button */}
        <button
          onClick={handleMatch}
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
          {isLoading ? 'Matching...' : 'Find Matches'}
        </button>

        {/* Error Message */}
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ width: '100%', height: '500px', borderRadius: '8px', overflow: 'hidden' }} ref={mapContainerRef} />

      {/* Results Tip */}
      {results && results.results && results.results.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Tip>
            Found {results.results.length} {results.results.length === 1 ? 'match' : 'matches'}. Hover over markers to see details. Line thickness indicates confidence score.
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
