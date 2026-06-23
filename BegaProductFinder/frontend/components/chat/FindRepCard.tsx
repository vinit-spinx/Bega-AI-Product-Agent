'use client';

import { useEffect, useState } from 'react';
import {
  getRepresentativeCountries, getRepresentativeStates, searchRepresentatives,
  type RepresentativeCountry, type RepresentativeResult, type RepresentativeState,
} from '@/lib/api';

export default function FindRepCard() {
  const [countries, setCountries] = useState<RepresentativeCountry[]>([]);
  const [zip, setZip] = useState('');
  const [countryId, setCountryId] = useState('');
  const [states, setStates] = useState<RepresentativeState[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [stateId, setStateId] = useState('');
  const [stateText, setStateText] = useState('');
  const [city, setCity] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<RepresentativeResult[] | null>(null);

  useEffect(() => {
    getRepresentativeCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  // Once a country is selected, swap the free-text State field for a dropdown of that
  // country's states. Until a country is chosen (or it has no states on file), State stays
  // a free-text input.
  useEffect(() => {
    setStateId('');
    setStateText('');
    if (countryId === '') {
      setStates([]);
      return;
    }
    setStatesLoading(true);
    getRepresentativeStates(Number(countryId))
      .then(setStates)
      .catch(() => setStates([]))
      .finally(() => setStatesLoading(false));
  }, [countryId]);

  const handleFind = async () => {
    const hasZip = zip.trim().length > 0;
    const hasOtherFilter = countryId !== '' || stateId !== '' || stateText.trim().length > 0 || city.trim().length > 0;
    if (!hasZip && !hasOtherFilter) {
      setError('Enter a zip/postal code, or search by country, state, or city.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await searchRepresentatives({
        zip: hasZip ? zip.trim() : undefined,
        countryId: countryId !== '' ? Number(countryId) : undefined,
        stateId: stateId !== '' ? Number(stateId) : undefined,
        stateText: stateId === '' ? (stateText.trim() || undefined) : undefined,
        city: city.trim() || undefined,
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-bega-border-1 bg-white px-6 py-6 max-w-lg">
      <h3 className="text-2xl font-normal text-bega-text-1 leading-tight mb-5">
        Find Your<br />Representative
      </h3>

      <input
        type="text"
        value={zip}
        onChange={e => setZip(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleFind()}
        placeholder="Zip Code / Postal Code"
        autoComplete="off"
        name="bega-rep-zip"
        className="w-full border border-bega-border-2 rounded-none px-4 py-3 text-sm
                   text-bega-text-1 placeholder-bega-text-3 bg-white
                   focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                   hover:border-bega-border-3 transition-colors"
      />

      <p className="italic text-bega-text-2 text-sm mt-4 mb-2">Or search by</p>

      <div className="flex gap-3">
        <select
          value={countryId}
          onChange={e => setCountryId(e.target.value)}
          className="flex-1 border border-bega-border-2 rounded-none px-4 py-3 text-sm
                     text-bega-text-1 bg-white appearance-none cursor-pointer
                     focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                     hover:border-bega-border-3 transition-colors"
        >
          <option value="">Select Country</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {countryId !== '' && states.length > 0 ? (
          <select
            value={stateId}
            onChange={e => setStateId(e.target.value)}
            disabled={statesLoading}
            className="flex-1 border border-bega-border-2 rounded-none px-4 py-3 text-sm
                       text-bega-text-1 bg-white appearance-none cursor-pointer disabled:opacity-50
                       focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                       hover:border-bega-border-3 transition-colors"
          >
            <option value="">{statesLoading ? 'Loading states…' : 'Select State'}</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={stateText}
            onChange={e => setStateText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFind()}
            placeholder="State"
            disabled={statesLoading}
            autoComplete="off"
            name="bega-rep-state"
            className="flex-1 border border-bega-border-2 rounded-none px-4 py-3 text-sm
                       text-bega-text-1 placeholder-bega-text-3 bg-white disabled:opacity-50
                       focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                       hover:border-bega-border-3 transition-colors"
          />
        )}
      </div>

      <input
        type="text"
        value={city}
        onChange={e => setCity(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleFind()}
        placeholder="City"
        autoComplete="off"
        name="bega-rep-city"
        className="w-full border border-bega-border-2 rounded-none px-4 py-3 text-sm mt-3
                   text-bega-text-1 placeholder-bega-text-3 bg-white
                   focus:outline-none focus:border-bega-black/60 focus:ring-1 focus:ring-bega-black/20
                   hover:border-bega-border-3 transition-colors"
      />

      {error && <p className="text-red-600 text-xs mt-3">{error}</p>}

      <button
        onClick={handleFind}
        disabled={loading}
        className="w-full bg-bega-black text-white font-semibold text-sm py-3.5 mt-4
                   hover:bg-bega-text-2 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? 'Searching…' : 'Find'}
      </button>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {results != null && (
        <div className="mt-5 pt-5 border-t border-bega-border-1 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-bega-text-3">
              No representatives found for that search. Try a broader search, or use &ldquo;Connect with BEGA
              Team&rdquo; and we&apos;ll match you with the right contact.
            </p>
          ) : (
            results.map(rep => (
              <div key={rep.id} className="border border-bega-border-1 rounded-md px-4 py-3">
                <p className="font-semibold text-bega-text-1 text-sm">{rep.agencyName}</p>
                <p className="text-bega-text-2 text-xs mt-0.5">{rep.address}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  {rep.phone && (
                    <a href={`tel:${rep.phone}`} className="text-bega-black hover:underline font-medium">{rep.phone}</a>
                  )}
                  {rep.email && (
                    <a href={`mailto:${rep.email}`} className="text-bega-black hover:underline font-medium">{rep.email}</a>
                  )}
                  {rep.website && (
                    <a href={rep.website} target="_blank" rel="noopener noreferrer"
                      className="text-bega-black hover:underline font-medium">Visit website ↗</a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
