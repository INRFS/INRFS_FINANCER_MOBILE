import React, { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";
import { Button, Card } from "../../components/ui";
import { s } from "./styles";

const message = (e: unknown) => e instanceof Error ? e.message : "Request failed. Please try again.";

export function useRemote<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { 
    setLoading(true); 
    setError(""); 
    try { 
      setData(await loader()); 
    } catch (e) { 
      setError(message(e)); 
    } finally { 
      setLoading(false); 
    } 
  }, [loader]);
  
  useEffect(() => { void refresh(); }, [refresh]); 
  
  return { data, loading, error, refresh };
}

export function RemoteState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <Card><Text style={s.muted}>Loading…</Text></Card>;
  if (error) return <Card><Text style={s.error}>{error}</Text><Button label="Retry" variant="secondary" onPress={retry}/></Card>;
  return null;
}
