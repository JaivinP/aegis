export default function EscalationDrafts({ shipment, analysis, status }) {
  const isCompromised = status === 'COMPROMISED'

  return (
    <div className="escalation-section">
      <div className="escalation-header">
        <div className="section-label mono">ESCALATION DOCUMENTS</div>
        <h2 className="escalation-title">Draft Documents for Review</h2>
        <p className="escalation-subhead">
          The following documents were drafted by the Aegis Response Agent based on automated sensor analysis.
          Each document requires review and approval by a qualified officer before submission or implementation.
        </p>
      </div>

      <div className="escalation-grid">
        <EscalationDoc
          title="FDA Deviation Report"
          tag="DRAFT — REQUIRES APPROVAL"
          tagColor="amber"
          body={[
            `PRODUCT: ${shipment.name}`,
            `COMPLIANCE FRAMEWORK: ${shipment.complianceFramework}`,
            ``,
            `DESCRIPTION OF DEVIATION:`,
            `This report documents recorded condition exceptions during transport. Sensor data indicates the product was exposed to conditions outside the approved range (${shipment.tempRange || `${shipment.tempMin}°C - ${shipment.tempMax}°C`}). Chain-of-custody events and sensor snapshots should be reviewed for exact timing and magnitude.`,
            ``,
            `ESTIMATED IMPACT:`,
            `Product Viability Score: ${analysis.viabilityScore.toFixed(1)}%`,
            `Estimated Degradation Risk: ${analysis.degradationRisk.toFixed(1)}%`,
            ``,
            `REFERENCE: 21 CFR Part 211.68 — Equipment Calibration and Maintenance Records`,
            ``,
            `This document is a draft prepared by automated analysis. It must be reviewed and approved by a qualified pharmacist or quality assurance officer before official submission to the FDA.`,
          ].join('\n')}
        />

        <EscalationDoc
          title="Receiving Pharmacy Notification"
          tag="DRAFT — REQUIRES APPROVAL"
          tagColor="amber"
          body={[
            `TO: Receiving Pharmacy / Clinical Staff`,
            `RE: ${shipment.name} — Shipment Condition Alert`,
            ``,
            `This notice advises that the above-referenced shipment has been flagged for condition deviation during transit. Automated multi-sensor monitoring detected a suspected seal compromise and temperature excursion that may have affected product integrity.`,
            ``,
            `ACTION REQUIRED:`,
            `Do not dispense this product until a viability assessment has been completed by a licensed pharmacist. Quarantine the shipment upon receipt and retain all packaging for potential investigation.`,
            ``,
            `All chain-of-custody records, sensor logs, and incident documentation are attached to this notification.`,
            ``,
            `This notification is a draft prepared by the Aegis automated intelligence system. It must be reviewed and approved before transmission to the receiving party.`,
          ].join('\n')}
        />

        {isCompromised && (
          <EscalationDoc
            title="Insurance Claim — Cargo Loss"
            tag="DRAFT — REQUIRES APPROVAL"
            tagColor="red"
            body={[
              `CLAIM TYPE: Cold Chain Cargo Damage`,
              `PRODUCT: ${shipment.name}`,
              ``,
              `SUMMARY OF LOSS:`,
              `The referenced shipment sustained condition-compromising events during transit, including recorded handling and environmental exceptions. The resulting Product Viability Score of ${analysis.viabilityScore.toFixed(1)}% indicates material degradation inconsistent with the original shipment specification.`,
              ``,
              `SUPPORTING EVIDENCE:`,
              `  • Shock event log with timestamps and magnitude`,
              `  • Temperature deviation records with duration analysis`,
              `  • Chain-of-custody audit trail`,
              `  • Seal breach sensor data`,
              `  • AI incident classification report`,
              ``,
              `This claim draft has been prepared by the Aegis automated analysis system and must be reviewed by authorized personnel before submission to the insurer.`,
            ].join('\n')}
          />
        )}

        <EscalationDoc
          title="Quarantine Recommendation"
          tag={isCompromised ? 'DRAFT — URGENT' : 'DRAFT — ADVISORY'}
          tagColor={isCompromised ? 'red' : 'amber'}
          body={[
            `RECOMMENDATION: ${isCompromised ? 'IMMEDIATE QUARANTINE' : 'PRECAUTIONARY QUARANTINE'}`,
            ``,
            `PRODUCT: ${shipment.name}`,
            ``,
            `BASIS FOR RECOMMENDATION:`,
            `Automated analysis detected conditions that may have compromised product integrity. Confidence scores: Seal Breach ${analysis.sealBreachConfidence.toFixed(0)}%, Tampering ${analysis.tamperingConfidence.toFixed(0)}%, Negligence ${analysis.negligenceConfidence.toFixed(0)}%.`,
            ``,
            isCompromised
              ? `IMMEDIATE ACTION: This product should be physically isolated from all other inventory without delay. Do not allow any use, distribution, or dispensing until formal quality assurance review is complete.`
              : `ADVISORY: This product should be separated from regular inventory as a precautionary measure. A licensed pharmacist should assess viability before any dispensing decision is made.`,
            ``,
            `This recommendation is generated by automated condition analysis and requires approval by a qualified officer before implementation.`,
          ].join('\n')}
        />
      </div>
    </div>
  )
}

function EscalationDoc({ title, tag, tagColor, body }) {
  const tagStyles = {
    amber: {
      bg: 'rgba(245,158,11,0.1)',
      color: 'var(--amber)',
      border: 'rgba(245,158,11,0.25)',
    },
    red: {
      bg: 'rgba(239,68,68,0.1)',
      color: 'var(--red)',
      border: 'rgba(239,68,68,0.25)',
    },
  }
  const s = tagStyles[tagColor] || tagStyles.amber

  return (
    <div className="escalation-doc">
      <div className="escalation-doc-header">
        <h3 className="escalation-doc-title">{title}</h3>
        <span
          className="escalation-doc-tag mono"
          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          {tag}
        </span>
      </div>
      <pre className="escalation-doc-body">{body}</pre>
    </div>
  )
}
