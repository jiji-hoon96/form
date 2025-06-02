import { batch } from '@tanstack/store'

export class ValidationRunner<
	TValueContainer,
	TValidator extends {
		validate?: (value: any, meta?: any) => any;
		cause?: string;
		key?: string;
		meta?: any;
	},
	TRawError,
	TProcessedError,
	TErrorKey extends string = string,
	TAggregatedErrors = Record<TErrorKey, unknown>,
	TOptions = Record<string, unknown>,
> {
	private runValidatorFn: (
		validator: TValidator,
		valueContainer: TValueContainer,
	) => TRawError;
	private processErrorsFn: (
		rawError: TRawError,
		validator: TValidator,
		currentAggregatedErrors?: TAggregatedErrors,
	) => {
		processedError: TProcessedError;
		aggregatedErrors: TAggregatedErrors;
		hasIndividualError: boolean;
	};
	private getValidatorsFn: (
		validationCause: string,
		validationOptions: TOptions,
	) => TValidator[];

	constructor(
		runValidatorFn: (
			validator: TValidator,
			valueContainer: TValueContainer,
		) => TRawError,
		processErrorsFn: (
			rawError: TRawError,
			validator: TValidator,
			currentAggregatedErrors?: TAggregatedErrors,
		) => {
			processedError: TProcessedError;
			aggregatedErrors: TAggregatedErrors;
			hasIndividualError: boolean;
		},
		getValidatorsFn: (
			validationCause: string,
			validationOptions: TOptions,
		) => TValidator[],
	) {
		this.runValidatorFn = runValidatorFn;
		this.processErrorsFn = processErrorsFn;
		this.getValidatorsFn = getValidatorsFn;
	}

	validate = (
		cause: string,
		options: TOptions,
		valueContainer: TValueContainer,
	): { hasErrored: boolean; errors: TAggregatedErrors | undefined } => {
		const validators = this.getValidatorsFn(cause, options);
		let overallHasErrored = false;
		let aggregatedValidationErrors: TAggregatedErrors | undefined = undefined;

		batch(() => {
			for (const validator of validators) {
				if (!validator.validate) {
					continue;
				}

				const rawError = this.runValidatorFn(validator, valueContainer);
				const { aggregatedErrors, hasIndividualError } = this.processErrorsFn(
					rawError,
					validator,
					aggregatedValidationErrors,
				);

				aggregatedValidationErrors = aggregatedErrors;
				if (hasIndividualError) {
					overallHasErrored = true;
				}
			}
		});

		return {
			hasErrored: overallHasErrored,
			errors: aggregatedValidationErrors,
		}
	}
}
