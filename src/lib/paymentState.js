// Currency comparisons use cents so fractional rounding cannot change status.
export function paymentState(total, paid) {
    const totalCents = Math.round(Number(total) * 100);
    const paidCents = Math.round(Number(paid) * 100);
    if (!Number.isFinite(totalCents) || totalCents <= 0 || !Number.isFinite(paidCents) || paidCents < 0) {
        throw new Error("Enter a positive quoted total and a deposit of zero or greater.");
    }
    const paymentStatus = paidCents >= totalCents ? "fully_paid" : paidCents > 0 ? "deposit_paid" : "unpaid";
    return { amount: paidCents / 100, paymentStatus, isPaid: paymentStatus === "fully_paid" };
}
export function paidTotal(payments) {
    return payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0) / 100;
}
