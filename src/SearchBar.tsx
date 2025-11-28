import { useState } from 'react';

// Props that this component will need from App.tsx
type SearchBarProps = {
  onSearch: (lat: number, lon: number) => void; // A function to call with results
  isLoading: boolean; // To disable the button while loading
  onTranslate?: (query: string) => void; // Optional handler for translation prep
  translatedText?: string | null;
  translationError?: string | null;
  isTranslating?: boolean;
  targetLanguage?: string;
};

function SearchBar({
  onSearch,
  isLoading,
  onTranslate,
  translatedText,
  translationError,
  isTranslating = false,
  targetLanguage,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const handleSearch = async () => {
    if (!trimmedQuery) return;

    // Use Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmedQuery
    )}&format=json&limit=1`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        // Pass the coordinates back up to the parent (App.tsx)
        onSearch(parseFloat(lat), parseFloat(lon));
      } else {
        alert('Address not found');
      }
    } catch (error) {
      console.error('Failed to geocode address:', error);
      alert('Failed to search for address');
    }
  };

  const handleTranslate = () => {
    if (!trimmedQuery || isLoading || isTranslating) return;
    if (onTranslate) {
      onTranslate(trimmedQuery);
    } else {
      console.info('Translate requested for:', trimmedQuery);
    }
  };

  return (
    <div className="search-container">
      <div className="search-row">
        <div className="search-field">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an address..."
            disabled={isLoading}
          />
        </div>
        <div className="search-actions">
          <button
            type="button"
            className="search-action search-action--primary"
            onClick={handleSearch}
            disabled={isLoading || !trimmedQuery}
            aria-label="Search location"
          >
            <span aria-hidden="true">🔍</span>
          </button>
          <button
            type="button"
            className="search-action"
            onClick={handleTranslate}
            disabled={isLoading || !trimmedQuery || isTranslating}
            aria-label="Translate query"
          >
            {isTranslating ? (
              <span className="search-action__spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">🌐</span>
            )}
          </button>
        </div>
      </div>

      <div className="search-feedback" aria-live="polite">
        {isTranslating && <span>Translating...</span>}
        {!isTranslating && translationError && (
          <span className="search-feedback--error">{translationError}</span>
        )}
        {!isTranslating && !translationError && translatedText && (
          <span>
            {translatedText}
            {targetLanguage && (
              <small>
                &nbsp;({targetLanguage.toUpperCase()})
              </small>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
