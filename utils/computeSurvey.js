/**
 * @param {object} framework loaded ikore framework JSON
 * @param {Record<string, 1|2|3>} answers
 */
export function getAllCapacityIds(framework) {
  const ids = [];
  for (const role of framework.roles) {
    for (const cap of role.capacities) {
      ids.push(cap.id);
    }
  }
  return ids;
}

export function getAllFoundationIds(framework) {
  const ids = [];
  for (const item of framework.foundation.attitudes) ids.push(item.id);
  for (const item of framework.foundation.capacities) ids.push(item.id);
  return ids;
}

export function findCapacity(framework, capacityId) {
  for (const role of framework.roles) {
    const cap = role.capacities.find((c) => c.id === capacityId);
    if (cap) return { role, capacity: cap };
  }
  return null;
}

/**
 * @returns {object} result payload for API / UI
 */
export function computeSurveyResult(framework, answers, foundation) {
  const roleSummaries = [];

  for (const role of framework.roles) {
    const capPoints = [];
    let sum = 0;
    for (const cap of role.capacities) {
      const level = answers[cap.id];
      if (level == null) continue;
      sum += level;
      capPoints.push({
        id: cap.id,
        title: cap.title,
        level,
        axisLabel: cap.shortTitle || cap.title,
      });
    }
    const n = capPoints.length;
    const average = n > 0 ? Math.round((sum / n) * 10) / 10 : 0;
    roleSummaries.push({
      roleId: role.id,
      roleTitle: role.title,
      average,
      capacities: capPoints,
    });
  }

  const overallRadar = roleSummaries.map((r) => ({
    subject: r.roleTitle,
    fullMark: 3,
    average: r.average,
  }));

  const weaknesses = [];
  for (const role of framework.roles) {
    for (const cap of role.capacities) {
      const level = answers[cap.id];
      if (level == null || level >= 3) continue;
      const next = String(level + 1);
      weaknesses.push({
        capacityId: cap.id,
        title: cap.title,
        roleId: role.id,
        roleTitle: role.title,
        level,
        nextLevel: level + 1,
        improvementHint: cap.levels[next] || "",
      });
    }
  }

  const foundationSummary = {
    attitudes: framework.foundation.attitudes.map((item) => ({
      id: item.id,
      title: item.title,
      demonstrated: Boolean(foundation[item.id]),
    })),
    capacities: framework.foundation.capacities.map((item) => ({
      id: item.id,
      title: item.title,
      demonstrated: Boolean(foundation[item.id]),
    })),
  };

  const overallAverage =
    roleSummaries.length > 0
      ? Math.round(
          (roleSummaries.reduce((s, r) => s + r.average, 0) / roleSummaries.length) * 10
        ) / 10
      : 0;

  return {
    frameworkVersion: framework.version,
    roleSummaries,
    overallRadar,
    overallAverage,
    gapCount: weaknesses.length,
    weaknesses,
    foundation: foundationSummary,
  };
}

export function validateComplete(framework, answers, foundation) {
  const missingCaps = [];
  for (const id of getAllCapacityIds(framework)) {
    const v = answers[id];
    if (v !== 1 && v !== 2 && v !== 3) missingCaps.push(id);
  }
  const missingFound = [];
  for (const id of getAllFoundationIds(framework)) {
    if (typeof foundation[id] !== "boolean") missingFound.push(id);
  }
  return { ok: missingCaps.length === 0 && missingFound.length === 0, missingCaps, missingFound };
}
