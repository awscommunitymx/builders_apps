import { useAgendaData } from './useAgendaData';

export function useAgendaDisplay(location: string) {
  // Get agenda data from useAgendaData hook
  const {
    sessions,
    location: actualLocation,
    loading,
    error,
  } = useAgendaData(location);

  return {
    loading,
    error,
    sessions,
    location: actualLocation,
  };
}
