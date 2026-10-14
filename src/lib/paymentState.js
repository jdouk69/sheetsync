// Currency comparisons use cents so fractional rounding cannot change status.
export function paymentState(total, paid) {
    const totalCents = Math.round(Number(total) * 100);
    const paidCents = Math.round(Number(paid) * 100);
    const paymentStatus = totalCents > 0 && paidCents >= totalCents ? "fully_paid" : paidCents > 0 ? "deposit_paid" : "unpaid";
    return { amount: paidCents / 100, paymentStatus, isPaid: paymentStatus === "fully_paid" };
}
export function paidTotal(payments) {
    return payments.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0) / 100;
}
