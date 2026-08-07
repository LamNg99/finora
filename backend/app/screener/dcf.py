from dataclasses import dataclass

# Minimum FCF history data points required to compute a CAGR-based growth rate
MIN_FCF_HISTORY = 3


@dataclass
class DCFResult:
    intrinsic_value: float
    current_price: float
    margin_of_safety: float
    is_undervalued: bool
    growth_rate_used: float


def calculate_dcf(  # ruff:ignore[too-many-arguments]
    free_cash_flows: list[float],
    current_price: float,
    shares_outstanding: float,
    net_debt: float = 0.0,
    wacc: float = 0.10,
    terminal_growth_rate: float = 0.025,
    projection_years: int = 10,
) -> DCFResult | None:
    if not free_cash_flows or shares_outstanding <= 0:
        return None

    recent_fcfs = [f for f in free_cash_flows[:3] if f > 0]
    if not recent_fcfs:
        return None
    base_fcf = sum(recent_fcfs) / len(recent_fcfs)

    if (
        len(free_cash_flows) >= MIN_FCF_HISTORY
        and free_cash_flows[-1] > 0
        and free_cash_flows[0] > 0
    ):
        years = len(free_cash_flows) - 1
        cagr = (free_cash_flows[0] / free_cash_flows[-1]) ** (1 / years) - 1
        growth_rate = min(max(cagr * 0.80, 0.01), 0.15)
    else:
        growth_rate = 0.03

    projected = []
    fcf = base_fcf
    for _ in range(projection_years):
        fcf *= 1 + growth_rate
        projected.append(fcf)

    pv_fcfs = sum(cf / (1 + wacc) ** (i + 1) for i, cf in enumerate(projected))
    terminal_value = (
        projected[-1]
        * (1 + terminal_growth_rate)
        / (wacc - terminal_growth_rate)
    )
    pv_terminal = terminal_value / (1 + wacc) ** projection_years

    equity_value = (pv_fcfs + pv_terminal) - net_debt
    intrinsic = equity_value / shares_outstanding
    margin = (intrinsic - current_price) / intrinsic if intrinsic else 0

    return DCFResult(
        intrinsic_value=round(intrinsic, 2),
        current_price=round(current_price, 2),
        margin_of_safety=round(margin, 4),
        is_undervalued=intrinsic > current_price,
        growth_rate_used=round(growth_rate, 4),
    )
