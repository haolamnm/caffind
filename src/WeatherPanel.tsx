import type { WeatherData } from "./App";

type WeatherPanelProps = {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
};

function WeatherPanel({ weather, isLoading, error }: WeatherPanelProps) {
  const iconUrl = weather?.icon
    ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png`
    : null;

  return (
    <div className="weather-panel">
      {isLoading && <p>Loading weather...</p>}
      {!isLoading && error && <p>{error}</p>}
      {!isLoading && !error && weather && (
        <div>
          <p className="weather-panel__location">{weather.city ?? "Selected location"}</p>
          <div className="weather-panel__current">
            {iconUrl && (
              <img
                src={iconUrl}
                alt={weather.description}
                className="weather-panel__icon"
              />
            )}
            <div>
              <p className="weather-panel__temp">
                {Math.round(weather.temp)}&deg;C
              </p>
              <p className="weather-panel__description">{weather.description}</p>
            </div>
          </div>
          <div className="weather-panel__meta">
            <p>Feels like {Math.round(weather.feelsLike)}&deg;C</p>
            <p>Humidity {weather.humidity}%</p>
            <p>Wind {Math.round(weather.windSpeed)} m/s</p>
          </div>
        </div>
      )}
      {!isLoading && !error && !weather && (
        <p>Select a location to see weather.</p>
      )}
    </div>
  );
}

export default WeatherPanel;
