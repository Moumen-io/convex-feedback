export interface ChoiceChipOption<Value extends string = string> {
  value: Value;
  label: string;
}

export interface ChoiceChipsBaseProps<Value extends string = string> {
  options: readonly ChoiceChipOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}
