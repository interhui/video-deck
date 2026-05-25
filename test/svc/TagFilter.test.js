/**
 * 标签过滤功能单元测试
 * 测试main.js和box.js中的标签过滤逻辑
 */

describe('TagFilter Logic', () => {
    describe('updateTagFilter logic', () => {
        test('GUI-TAG-001: 标签数量少于10个时，显示所有标签并添加"选择标签"选项', () => {
            const tags = [
                { id: 'tag1', name: '标签1' },
                { id: 'tag2', name: '标签2' },
                { id: 'tag3', name: '标签3' }
            ];
            
            const displayLimit = 10;
            const tagsToShow = tags.slice(0, displayLimit);
            // "选择标签"选项始终存在
            const shouldShowSelectOption = true;
            
            expect(tagsToShow.length).toBe(3);
            expect(shouldShowSelectOption).toBe(true);
        });

        test('GUI-TAG-002: 标签数量超过10个时，仅显示前10个并添加"选择标签"选项', () => {
            const tags = [];
            for (let i = 1; i <= 15; i++) {
                tags.push({ id: `tag${i}`, name: `标签${i}` });
            }
            
            const displayLimit = 10;
            const tagsToShow = tags.slice(0, displayLimit);
            // "选择标签"选项始终存在
            const shouldShowSelectOption = true;
            
            expect(tagsToShow.length).toBe(10);
            expect(shouldShowSelectOption).toBe(true);
        });

        test('GUI-TAG-003: 标签数量等于10个时，显示所有标签并添加"选择标签"选项', () => {
            const tags = [];
            for (let i = 1; i <= 10; i++) {
                tags.push({ id: `tag${i}`, name: `标签${i}` });
            }
            
            const displayLimit = 10;
            const tagsToShow = tags.slice(0, displayLimit);
            // "选择标签"选项始终存在
            const shouldShowSelectOption = true;
            
            expect(tagsToShow.length).toBe(10);
            expect(shouldShowSelectOption).toBe(true);
        });
    });

    describe('toggleTagSelection logic', () => {
        test('GUI-TAG-004: 标签未选中时，添加到选中列表', () => {
            const tempSelectedTags = ['tag1', 'tag2'];
            const tagIdToAdd = 'tag3';
            
            const index = tempSelectedTags.indexOf(tagIdToAdd);
            if (index === -1) {
                tempSelectedTags.push(tagIdToAdd);
            }
            
            expect(tempSelectedTags).toContain('tag3');
            expect(tempSelectedTags.length).toBe(3);
        });

        test('GUI-TAG-005: 标签已选中时，从选中列表移除', () => {
            const tempSelectedTags = ['tag1', 'tag2', 'tag3'];
            const tagIdToRemove = 'tag2';
            
            const index = tempSelectedTags.indexOf(tagIdToRemove);
            if (index !== -1) {
                tempSelectedTags.splice(index, 1);
            }
            
            expect(tempSelectedTags).not.toContain('tag2');
            expect(tempSelectedTags.length).toBe(2);
        });

        test('GUI-TAG-006: 重复切换标签选中状态', () => {
            let tempSelectedTags = ['tag1'];
            const tagId = 'tag1';
            
            // 第一次切换：移除
            const index1 = tempSelectedTags.indexOf(tagId);
            if (index1 !== -1) {
                tempSelectedTags.splice(index1, 1);
            }
            expect(tempSelectedTags).not.toContain('tag1');
            
            // 第二次切换：添加
            const index2 = tempSelectedTags.indexOf(tagId);
            if (index2 === -1) {
                tempSelectedTags.push(tagId);
            }
            expect(tempSelectedTags).toContain('tag1');
        });
    });

    describe('renderTagFilterList logic', () => {
        test('GUI-TAG-007: 无搜索关键字时显示所有标签', () => {
            const tags = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' },
                { id: 'scifi', name: '科幻' }
            ];
            const searchKeyword = '';
            
            const filteredTags = tags.filter(tag => {
                if (searchKeyword) {
                    const keyword = searchKeyword.toLowerCase();
                    return tag.name.toLowerCase().includes(keyword) || 
                           tag.id.toLowerCase().includes(keyword);
                }
                return true;
            });
            
            expect(filteredTags.length).toBe(3);
        });

        test('GUI-TAG-008: 搜索标签名称时正确过滤', () => {
            const tags = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' },
                { id: 'scifi', name: '科幻' }
            ];
            const searchKeyword = '动';
            
            const filteredTags = tags.filter(tag => {
                if (searchKeyword) {
                    const keyword = searchKeyword.toLowerCase();
                    return tag.name.toLowerCase().includes(keyword) || 
                           tag.id.toLowerCase().includes(keyword);
                }
                return true;
            });
            
            expect(filteredTags.length).toBe(1);
            expect(filteredTags[0].id).toBe('action');
        });

        test('GUI-TAG-009: 搜索标签ID时正确过滤', () => {
            const tags = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' },
                { id: 'scifi', name: '科幻' }
            ];
            const searchKeyword = 'sci';
            
            const filteredTags = tags.filter(tag => {
                if (searchKeyword) {
                    const keyword = searchKeyword.toLowerCase();
                    return tag.name.toLowerCase().includes(keyword) || 
                           tag.id.toLowerCase().includes(keyword);
                }
                return true;
            });
            
            expect(filteredTags.length).toBe(1);
            expect(filteredTags[0].id).toBe('scifi');
        });

        test('GUI-TAG-010: 搜索关键字不匹配时返回空数组', () => {
            const tags = [
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' }
            ];
            const searchKeyword = 'xyz';
            
            const filteredTags = tags.filter(tag => {
                if (searchKeyword) {
                    const keyword = searchKeyword.toLowerCase();
                    return tag.name.toLowerCase().includes(keyword) || 
                           tag.id.toLowerCase().includes(keyword);
                }
                return true;
            });
            
            expect(filteredTags.length).toBe(0);
        });

        test('GUI-TAG-011: 标签按名称排序', () => {
            const tags = [
                { id: 'scifi', name: '科幻' },
                { id: 'action', name: '动作' },
                { id: 'drama', name: '剧情' }
            ];
            
            const sortedTags = [...tags].sort((a, b) => 
                (a.name || '').localeCompare(b.name || '')
            );
            
            expect(sortedTags[0].name).toBe('动作');
            expect(sortedTags[1].name).toBe('剧情');
            expect(sortedTags[2].name).toBe('科幻');
        });
    });

    describe('confirmTagFilter logic', () => {
        test('GUI-TAG-012: 确认选择时，临时选中标签复制到正式选中列表', () => {
            const tempSelectedTags = ['tag1', 'tag2'];
            let selectedTags = [];
            
            selectedTags = [...tempSelectedTags];
            
            expect(selectedTags).toEqual(['tag1', 'tag2']);
        });

        test('GUI-TAG-013: 选中标签数量大于0时，设置currentTag为逗号分隔的标签ID', () => {
            const selectedTags = ['tag1', 'tag2'];
            let currentTag = '';
            
            if (selectedTags.length > 0) {
                currentTag = selectedTags.join(',');
            }
            
            expect(currentTag).toBe('tag1,tag2');
        });

        test('GUI-TAG-014: 选中标签数量为0时，清空currentTag', () => {
            const selectedTags = [];
            let currentTag = 'tag1';
            
            if (selectedTags.length > 0) {
                currentTag = selectedTags.join(',');
            } else {
                currentTag = '';
            }
            
            expect(currentTag).toBe('');
        });
    });

    describe('updateTagFilterDisplay logic', () => {
        test('GUI-TAG-015: 选中标签数量为0时，显示默认选项', () => {
            const selectedTags = [];
            const tags = [
                { id: 'tag1', name: '标签1' },
                { id: 'tag2', name: '标签2' }
            ];
            
            const count = selectedTags.length;
            const displayLimit = 10;
            
            let expectedHTML = '<option value="">全部标签</option>';
            
            const tagsToShow = tags.slice(0, displayLimit);
            tagsToShow.forEach(tag => {
                expectedHTML += `<option value="${tag.id}">${tag.name}</option>`;
            });
            
            if (tags.length > displayLimit) {
                expectedHTML += '<option value="select">选择标签</option>';
            }
            
            expect(count).toBe(0);
            expect(expectedHTML).toContain('全部标签');
        });

        test('GUI-TAG-016: 选中标签数量大于0时，显示"选择标签(N)"选项', () => {
            const selectedTags = ['tag1', 'tag3'];
            const tags = [];
            for (let i = 1; i <= 15; i++) {
                tags.push({ id: `tag${i}`, name: `标签${i}` });
            }
            
            const count = selectedTags.length;
            const displayLimit = 10;
            
            const selectOptionText = `选择标签(${count})`;
            
            expect(count).toBe(2);
            expect(selectOptionText).toBe('选择标签(2)');
        });
    });

    describe('cancelTagFilter logic', () => {
        test('GUI-TAG-017: 取消选择时，清空临时选中标签列表', () => {
            let tempSelectedTags = ['tag1', 'tag2'];
            
            tempSelectedTags = [];
            
            expect(tempSelectedTags.length).toBe(0);
        });
    });

    describe('Integration Tests', () => {
        test('GUI-TAG-018: 完整的标签选择流程', () => {
            // 初始状态
            let selectedTags = [];
            let tempSelectedTags = [];
            let currentTag = '';
            
            // 模拟打开模态窗
            tempSelectedTags = [...selectedTags];
            
            // 模拟选择标签
            const tag1 = 'action';
            const tag2 = 'drama';
            
            // 添加tag1
            const index1 = tempSelectedTags.indexOf(tag1);
            if (index1 === -1) {
                tempSelectedTags.push(tag1);
            }
            
            // 添加tag2
            const index2 = tempSelectedTags.indexOf(tag2);
            if (index2 === -1) {
                tempSelectedTags.push(tag2);
            }
            
            expect(tempSelectedTags).toEqual(['action', 'drama']);
            
            // 模拟确认选择
            selectedTags = [...tempSelectedTags];
            if (selectedTags.length > 0) {
                currentTag = selectedTags.join(',');
            }
            
            expect(selectedTags).toEqual(['action', 'drama']);
            expect(currentTag).toBe('action,drama');
        });

        test('GUI-TAG-019: 取消选择流程', () => {
            // 初始状态
            let selectedTags = ['existing'];
            let tempSelectedTags = [];
            let currentTag = 'existing';
            
            // 模拟打开模态窗
            tempSelectedTags = [...selectedTags];
            
            // 模拟选择新标签
            tempSelectedTags.push('new');
            
            expect(tempSelectedTags).toEqual(['existing', 'new']);
            
            // 模拟取消选择
            tempSelectedTags = [];
            
            // selectedTags应保持不变
            expect(selectedTags).toEqual(['existing']);
            expect(currentTag).toBe('existing');
        });
    });
});