import type MagicString from 'magic-string';
import type { HasEffectsContext } from '../ExecutionContext';
import type { NodeInteraction } from '../NodeInteractions';
import {
	INTERACTION_ACCESSED,
	INTERACTION_ASSIGNED,
	INTERACTION_CALLED
} from '../NodeInteractions';
import type { ObjectPath } from '../utils/PathTracker';
import {
	getLiteralMembersForValue,
	getMemberReturnExpressionWhenCalled,
	hasMemberEffectWhenCalled,
	type MemberDescription
} from '../values';
import type * as NodeType from './NodeType';
import {
	type ExpressionEntity,
	type LiteralValueOrUnknown,
	UNKNOWN_EXPRESSION,
	UnknownValue
} from './shared/Expression';
import { type GenericEsTreeNode, NodeBase } from './shared/Node';

export type LiteralValue = string | boolean | null | number | RegExp | undefined;

export default class Literal<T extends LiteralValue = LiteralValue> extends NodeBase {
	declare regex?: {
		flags: string;
		pattern: string;
	};
	declare type: NodeType.tLiteral;
	declare value: T;

	private declare members: { [key: string]: MemberDescription };

	deoptimizeThisOnInteractionAtPath(): void {}

	getLiteralValueAtPath(path: ObjectPath): LiteralValueOrUnknown {
		if (
			path.length > 0 ||
			// unknown literals can also be null but do not start with an "n"
			(this.value === null && this.context.code.charCodeAt(this.start) !== 110) ||
			typeof this.value === 'bigint' ||
			// to support shims for regular expressions
			this.context.code.charCodeAt(this.start) === 47
		) {
			return UnknownValue;
		}
		return this.value;
	}

	getReturnExpressionWhenCalledAtPath(path: ObjectPath): ExpressionEntity {
		if (path.length !== 1) return UNKNOWN_EXPRESSION;
		return getMemberReturnExpressionWhenCalled(this.members, path[0]);
	}

	hasEffectsOnInteractionAtPath(
		path: ObjectPath,
		interaction: NodeInteraction,
		context: HasEffectsContext
	): boolean {
		switch (interaction.type) {
			case INTERACTION_ACCESSED: {
				return path.length > (this.value === null ? 0 : 1);
			}
			case INTERACTION_ASSIGNED: {
				return true;
			}
			case INTERACTION_CALLED: {
				return (
					path.length !== 1 ||
					hasMemberEffectWhenCalled(this.members, path[0], interaction, context)
				);
			}
		}
	}

	initialise(): void {
		this.members = getLiteralMembersForValue(this.value);
	}

	parseNode(esTreeNode: GenericEsTreeNode): void {
		this.value = esTreeNode.value;
		this.regex = esTreeNode.regex;
		super.parseNode(esTreeNode);
	}

	render(code: MagicString): void {
		if (typeof this.value === 'string') {
			(code.indentExclusionRanges as [number, number][]).push([this.start + 1, this.end - 1]);
		}
	}
}
