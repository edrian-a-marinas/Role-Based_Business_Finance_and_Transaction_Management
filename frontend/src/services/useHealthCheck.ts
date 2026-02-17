import { useEffect } from "react"

async function getHealth() {
  const response = await fetch("http://127.0.0.1:8000/health/");

  if (!response.ok) {
    throw new Error("Backend unhealthy")
  }

  return response.json()
}

export function useHealthCheck() {
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await getHealth()
      } catch (error) {
        console.error("Backend down")
      }
    }

    checkHealth()

    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [])
}