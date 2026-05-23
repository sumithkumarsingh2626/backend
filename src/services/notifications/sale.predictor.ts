import { IProduct } from '../../models/product.model';

export class SalePredictor {
  public static predict(product: IProduct): {
    isWeekendSaleLikely: boolean;
    isMajorSaleLikely: boolean;
  } {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday
    const month = today.getMonth(); // 0 = Jan... 11 = Dec

    // Simple heuristic: If it's Thursday or Friday, a weekend sale might be coming.
    const isWeekendSaleLikely = dayOfWeek === 4 || dayOfWeek === 5;

    // Major sale seasons (e.g., Black Friday in November, Summer Sale in June/July)
    // Here we just mock some basic logic.
    const isMajorSaleLikely = month === 10 || month === 5 || month === 6;

    return {
      isWeekendSaleLikely,
      isMajorSaleLikely,
    };
  }
}
