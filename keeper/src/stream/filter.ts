export const streamFilterSource = (programId: string): string => `function main(stream) {
  var PROGRAM_ID = ${JSON.stringify(programId)}
  var groups = Array.isArray(stream) ? stream : (stream && stream.data) || []
  var matches = []
  var marker = "Program data: "
  var text = function (line) { return typeof line === "string" ? line : "" }
  var collect = function (logs, signature, slot, blockTime) {
    var events = []
    var touched = false
    for (var i = 0; i < logs.length; i++) {
      var line = text(logs[i])
      if (line.indexOf("Program " + PROGRAM_ID + " invoke") === 0) touched = true
      if (line.indexOf(marker) === 0) {
        var payload = line.slice(marker.length).trim()
        if (payload) events.push(payload)
      }
    }
    if (!touched || !events.length || !signature) return
    matches.push({ signature: signature, slot: slot, blockTime: blockTime, events: events })
  }
  for (var g = 0; g < groups.length; g++) {
    var group = groups[g]
    if (group && group.transactions) {
      var slot = group.slot != null ? group.slot : (group.parentSlot != null ? group.parentSlot + 1 : null)
      for (var t = 0; t < group.transactions.length; t++) {
        var tx = group.transactions[t]
        if (!tx || !tx.meta || tx.meta.err) continue
        var message = (tx.transaction && tx.transaction.message) || {}
        var rawKeys = []
          .concat(message.accountKeys || [])
          .concat(message.staticAccountKeys || [])
          .concat((tx.meta.loadedAddresses && tx.meta.loadedAddresses.writable) || [])
          .concat((tx.meta.loadedAddresses && tx.meta.loadedAddresses.readonly) || [])
        var keys = rawKeys.map(function (key) { return typeof key === "string" ? key : key && key.pubkey }).filter(Boolean)
        var logs = tx.meta.logMessages || []
        var invoked = false
        for (var n = 0; n < logs.length; n++) {
          if (text(logs[n]).indexOf("Program " + PROGRAM_ID + " invoke") === 0) invoked = true
        }
        if (keys.indexOf(PROGRAM_ID) === -1 && !invoked) continue
        var signature = tx.transaction && tx.transaction.signatures && tx.transaction.signatures[0]
        collect(logs, signature, slot, group.blockTime)
      }
      continue
    }
    var rows = Array.isArray(group) ? group : [group]
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r]
      if (!row || row.success === false) continue
      var rowLogs = row.logs || []
      var invocations = row.programInvocations || []
      var listed = false
      for (var p = 0; p < invocations.length; p++) {
        if (invocations[p] && invocations[p].programId === PROGRAM_ID) listed = true
      }
      if (!listed) {
        for (var q = 0; q < rowLogs.length; q++) {
          if (text(rowLogs[q]).indexOf("Program " + PROGRAM_ID + " invoke") === 0) listed = true
        }
      }
      if (!listed) continue
      collect(rowLogs, row.signature, row.slot, row.blockTime)
    }
  }
  return matches.length ? { matches: matches } : null
}
`