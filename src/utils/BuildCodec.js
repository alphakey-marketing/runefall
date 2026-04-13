export function encodeBuild(playerState) {
  const data = {
    s: playerState.skillSlots.map(slot => ({
      r: slot.skillRune?.id || null,
      l: slot.links.map(l => l?.id || null)
    })),
    n: playerState.allocatedNodes,
    g: Object.fromEntries(
      Object.entries(playerState.equippedGear).map(([k, v]) => [k, v ? { id: v.id, affixes: v.affixes } : null])
    )
  };
  return btoa(JSON.stringify(data)).replace(/[+/=]/g, c => ({'+':'-','/':'_','=':''}[c]));
}

export function decodeBuild(code) {
  try {
    const padded = code.replace(/[-_]/g, c => ({'-':'+','_':'/'}[c]));
    const padLen = (4 - padded.length % 4) % 4;
    return JSON.parse(atob(padded + '='.repeat(padLen)));
  } catch { return null; }
}
