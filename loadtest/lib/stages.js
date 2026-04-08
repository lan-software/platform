// Helpers for building stage arrays with ramp up/down and fluctuation waves.
//
// rampWithFluctuation(peak, holdDuration, waveCount):
//   Returns stages that ramp 0 -> peak, hold while oscillating between
//   ~70% and 100% of peak `waveCount` times, then ramp peak -> 0.
//
// smokeRamp(peak, holdDuration):
//   Short ramp up + hold + ramp down for smoke-class scenarios.

export function smokeRamp(peak, holdDuration = '1m') {
  return [
    { duration: '15s', target: peak },
    { duration: holdDuration, target: peak },
    { duration: '15s', target: 0 },
  ];
}

export function rampWithFluctuation(peak, holdDuration = '10m', waveCount = 4) {
  const totalSeconds = parseDuration(holdDuration);
  const waveSeconds = Math.max(30, Math.floor(totalSeconds / (waveCount * 2)));
  const waveDur = `${waveSeconds}s`;
  const low = Math.max(1, Math.floor(peak * 0.7));

  const stages = [{ duration: '1m', target: peak }];
  for (let i = 0; i < waveCount; i++) {
    stages.push({ duration: waveDur, target: low });
    stages.push({ duration: waveDur, target: peak });
  }
  stages.push({ duration: '1m', target: 0 });
  return stages;
}

// Parses k6 duration strings like "10m", "1h30m", "45s" into seconds.
function parseDuration(d) {
  if (typeof d === 'number') return d;
  let total = 0;
  const re = /(\d+)([hms])/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const n = parseInt(m[1], 10);
    if (m[2] === 'h') total += n * 3600;
    else if (m[2] === 'm') total += n * 60;
    else total += n;
  }
  return total || 600;
}
