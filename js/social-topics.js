(function () {
  const mount = document.getElementById("social-topics-body");
  const data = window.SOCIAL_MATTRESS_TOPICS;
  if (!mount || !data?.topics?.length) return;

  const heatClass = (heat) => {
    if (heat === "极高") return "social-topics-heat-max";
    if (heat === "高") return "social-topics-heat-high";
    if (heat === "上升") return "social-topics-heat-rise";
    return "social-topics-heat-mid";
  };

  const platformTags = (platforms) =>
    platforms
      .map((p) => `<span class="social-topics-platform">${p}</span>`)
      .join("");

  const rowsHtml = data.topics
    .map(
      (topic) => `
      <tr class="social-topics-row${topic.rank <= 3 ? " social-topics-row-top" : ""}">
        <td class="social-topics-rank" data-label="排名">
          <span class="social-topics-rank-num">${topic.rank}</span>
        </td>
        <td class="social-topics-title" data-label="话题">
          <strong>${topic.title}</strong>
          <div class="social-topics-platforms">${platformTags(topic.platforms)}</div>
        </td>
        <td class="social-topics-heat" data-label="热度">
          <span class="social-topics-heat-badge ${heatClass(topic.heat)}">${topic.heat}</span>
        </td>
        <td class="social-topics-signal" data-label="讨论信号">${topic.signal}</td>
        <td class="social-topics-concerns" data-label="用户关切">
          <ul>${topic.concerns.map((c) => `<li>${c}</li>`).join("")}</ul>
        </td>
      </tr>`
    )
    .join("");

  const platformNotesHtml = data.platformNotes
    .map(
      (p) => `
      <article class="social-topics-platform-card">
        <h3>${p.name}</h3>
        <p>${p.note}</p>
      </article>`
    )
    .join("");

  mount.innerHTML = `
    <p class="social-topics-intro">${data.intro}</p>
    <div class="social-topics-table-wrap">
      <table class="social-topics-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">话题</th>
            <th scope="col">热度</th>
            <th scope="col">讨论信号</th>
            <th scope="col">用户核心关切</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="social-topics-block">
      <h2>各平台讨论特点</h2>
      <div class="social-topics-platform-grid">${platformNotesHtml}</div>
    </div>
    <p class="market-highlight social-topics-relevance"><strong>洞察：</strong>${data.projectRelevance}</p>
    <p class="background-sources">${data.sources}</p>
  `;
})();
