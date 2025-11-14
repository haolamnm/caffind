import { useState } from 'react';

// Props that this component will need from App.tsx
type SearchBarProps = {
  onSearch: (lat: number, lon: number) => void; // A function to call with results
  isLoading: boolean; // To disable the button while loading
};

function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    if (!query) return;

    // Use Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
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

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for an address..."
        disabled={isLoading}
      />
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? '...' : 'Search'}
      </button>
    </div>
  );
}

export default SearchBar;
